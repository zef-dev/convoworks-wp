<?php

namespace Convo\Core\Media;

/**
 * Lightweight MP3 tag reader used instead of wapmorgan/mp3info.
 *
 * It focuses on the fields Convoworks actually uses:
 *  - song title
 *  - artist
 *  - album
 *  - genre
 *
 * It supports:
 *  - ID3v1 tags (last 128 bytes of the file)
 *  - Basic ID3v2.3/2.4 text frames (TIT2, TPE1, TALB, TCON)
 *
 * It intentionally does NOT attempt to calculate duration, bitrate, etc.
 * to avoid fragile math and associated PHP warnings.
 */
class SimpleMp3Info
{
    /**
     * @var array<string,string>
     */
    public $tags = [
        'artist' => '',
        'song' => '',
        'album' => '',
        'genre' => '',
    ];

    /**
     * @param string $filePath
     */
    public function __construct($filePath)
    {
        if (!is_file($filePath) || !is_readable($filePath)) {
            throw new \RuntimeException('MP3 file not readable [' . $filePath . ']');
        }

        // Try to parse ID3v2 first (beginning of file)
        $this->_parseId3v2($filePath);

        // Fallback / complement with ID3v1 (end of file)
        $this->_parseId3v1($filePath);
    }

    /**
     * Read ID3v1 metadata from the last 128 bytes of the file.
     *
     * @param string $filePath
     * @return void
     */
    private function _parseId3v1($filePath)
    {
        $size = @filesize($filePath);
        if ($size === false || $size < 128) {
            return;
        }

        $fp = @fopen($filePath, 'rb');
        if (!$fp) {
            return;
        }

        // Seek to last 128 bytes where ID3v1 tag should be
        fseek($fp, (int) ($size - 128));
        $data = fread($fp, 128);
        fclose($fp);

        if ($data === false || \strlen($data) !== 128) {
            return;
        }

        if (substr($data, 0, 3) !== 'TAG') {
            // No ID3v1 tag present
            return;
        }

        $title = $this->_cleanString(substr($data, 3, 30));
        $artist = $this->_cleanString(substr($data, 33, 30));
        $album = $this->_cleanString(substr($data, 63, 30));

        if ($artist !== '' && $this->tags['artist'] === '') {
            $this->tags['artist'] = $artist;
        }
        if ($title !== '' && $this->tags['song'] === '') {
            $this->tags['song'] = $title;
        }
        if ($album !== '' && $this->tags['album'] === '') {
            $this->tags['album'] = $album;
        }

        // Genre is a numeric index; mapping table is not critical for our usage,
        // so we deliberately skip converting it to a human-readable string.
    }

    /**
     * Parse ID3v2.3/2.4 text frames at the beginning of the file.
     *
     * @param string $filePath
     * @return void
     */
    private function _parseId3v2($filePath)
    {
        $fp = @fopen($filePath, 'rb');
        if (!$fp) {
            return;
        }

        $header = fread($fp, 10);
        if ($header === false || \strlen($header) !== 10 || substr($header, 0, 3) !== 'ID3') {
            fclose($fp);
            return;
        }

        $versionMajor = \ord($header[3]);
        // $versionMinor = ord($header[4]); // Not used at the moment.
        $flags = \ord($header[5]);
        $sizeBytes = \substr($header, 6, 4);

        $tagSize = $this->_synchsafeToInt($sizeBytes);
        if ($tagSize <= 0) {
            fclose($fp);
            return;
        }

        $bytesRead = 0;

        // Handle extended header if present (bit 6 of flags for v2.3/2.4)
        if ($flags & 0x40) {
            $extHeaderSizeBytes = fread($fp, 4);
            if ($extHeaderSizeBytes === false || \strlen($extHeaderSizeBytes) !== 4) {
                fclose($fp);
                return;
            }

            $extHeaderSize = $versionMajor === 4
                ? $this->_synchsafeToInt($extHeaderSizeBytes)
                : $this->_bytesToInt($extHeaderSizeBytes);

            if ($extHeaderSize > 0) {
                // Skip the rest of the extended header body
                fseek($fp, (int) $extHeaderSize, SEEK_CUR);
                $bytesRead += 4 + $extHeaderSize;
            }
        }

        // Now read frames up to tagSize
        while ($bytesRead < $tagSize) {
            $frameHeader = fread($fp, 10);
            if ($frameHeader === false || \strlen($frameHeader) !== 10) {
                break;
            }

            $frameId = substr($frameHeader, 0, 4);
            if (trim($frameId, "\0") === '') {
                // Padding or invalid; stop here.
                break;
            }

            $frameSizeBytes = substr($frameHeader, 4, 4);
            $frameFlags = substr($frameHeader, 8, 2); // Not used, but read to advance.

            if ($versionMajor === 4) {
                $frameSize = $this->_synchsafeToInt($frameSizeBytes);
            } else {
                $frameSize = $this->_bytesToInt($frameSizeBytes);
            }

            $bytesRead += 10;

            if ($frameSize <= 0 || $bytesRead + $frameSize > $tagSize + 10) {
                // Invalid or truncated; stop parsing frames.
                break;
            }

            $frameData = $frameSize > 0 ? fread($fp, $frameSize) : '';
            if ($frameData === false || \strlen($frameData) !== $frameSize) {
                break;
            }

            $bytesRead += $frameSize;

            // Only interested in common text frames.
            if (\in_array($frameId, ['TIT2', 'TPE1', 'TALB', 'TCON'], true)) {
                $text = $this->_decodeTextFrame($frameData);
                if ($text !== '') {
                    if ($frameId === 'TIT2' && $this->tags['song'] === '') {
                        $this->tags['song'] = $text;
                    } elseif ($frameId === 'TPE1' && $this->tags['artist'] === '') {
                        $this->tags['artist'] = $text;
                    } elseif ($frameId === 'TALB' && $this->tags['album'] === '') {
                        $this->tags['album'] = $text;
                    } elseif ($frameId === 'TCON' && $this->tags['genre'] === '') {
                        $this->tags['genre'] = $text;
                    }
                }
            }
        }

        fclose($fp);
    }

    /**
     * Decode ID3 text frame data.
     *
     * @param string $data
     * @return string
     */
    private function _decodeTextFrame($data)
    {
        if ($data === '') {
            return '';
        }

        // First byte is encoding: 0=ISO-8859-1, 1=UTF-16 with BOM, 2=UTF-16BE, 3=UTF-8
        $encoding = \ord($data[0]);
        $raw = \substr($data, 1);

        // Trim null bytes and whitespace.
        $raw = \rtrim($raw, "\0");

        if ($raw === '') {
            return '';
        }

        // We normalize everything to UTF-8 for internal use.
        if (!function_exists('mb_convert_encoding')) {
            // Fallback if mbstring is not available.
            return $this->_cleanString($raw);
        }

        switch ($encoding) {
            case 0:
                // ISO-8859-1
                $text = @mb_convert_encoding($raw, 'UTF-8', 'ISO-8859-1');
                break;
            case 1:
                // UTF-16 with BOM
                $text = @mb_convert_encoding($raw, 'UTF-8', 'UTF-16');
                break;
            case 2:
                // UTF-16BE without BOM
                $text = @mb_convert_encoding($raw, 'UTF-8', 'UTF-16BE');
                break;
            case 3:
                // UTF-8
                $text = $raw;
                break;
            default:
                $text = $raw;
                break;
        }

        return $this->_cleanString($text);
    }

    /**
     * Convert a 4-byte "synchsafe" integer to int.
     *
     * @param string $bytes
     * @return int
     */
    private function _synchsafeToInt($bytes)
    {
        if (\strlen($bytes) !== 4) {
            return 0;
        }

        $b1 = \ord($bytes[0]);
        $b2 = \ord($bytes[1]);
        $b3 = \ord($bytes[2]);
        $b4 = \ord($bytes[3]);

        // Synchsafe integer: 7 bits per byte.
        return ($b1 << 21) | ($b2 << 14) | ($b3 << 7) | $b4;
    }

    /**
     * Convert a 4-byte big-endian integer to int.
     *
     * @param string $bytes
     * @return int
     */
    private function _bytesToInt($bytes)
    {
        if (\strlen($bytes) !== 4) {
            return 0;
        }

        $b1 = \ord($bytes[0]);
        $b2 = \ord($bytes[1]);
        $b3 = \ord($bytes[2]);
        $b4 = \ord($bytes[3]);

        return ($b1 << 24) | ($b2 << 16) | ($b3 << 8) | $b4;
    }

    /**
     * Normalize string: remove null bytes and trim whitespace.
     *
     * @param string $value
     * @return string
     */
    private function _cleanString($value)
    {
        $value = str_replace("\0", '', $value);
        $value = trim($value);
        return $value;
    }
}
