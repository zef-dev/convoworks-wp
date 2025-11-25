<?php

declare(strict_types=1);

namespace Convo\Pckg\Core\Elements;

use Convo\Core\Media\IAudioFile;
use Convo\Core\Workflow\IConversationElement;
use Convo\Core\Workflow\IMediaSourceContext;
use Convo\Core\Workflow\IConvoAudioResponse;
use Convo\Core\Workflow\AbstractWorkflowContainerComponent;
use Convo\Core\DataItemNotFoundException;
use Convo\Core\Params\IServiceParamsScope;
use Convo\Core\Workflow\IConvoRequest;
use Convo\Core\Workflow\IConvoResponse;

class SeekAudioPlaybackBySearch extends AbstractWorkflowContainerComponent implements IConversationElement
{
    /**
     * @var string
     */
    private $_contextId;

    /**
     * @var string
     */
    private $_searchTerm;

    /**
     * @var string
     */
    private $_mediaInfoVar;

    /**
     * @var IConversationElement[]
     */
    private $_fallback = [];

    /**
     * @param array{
     *     context_id: string,
     *     search_term?: string,
     *     media_info_var?: string,
     *     fallback?: IConversationElement[]
     * } $properties
     */
    public function __construct(array $properties)
    {
        parent::__construct($properties);
        $this->_contextId = $properties['context_id'];
        $this->_searchTerm = $properties['search_term'] ?? '';
        $this->_mediaInfoVar = $properties['media_info_var'] ?? 'media_info';

        foreach ($properties['fallback'] ?? [] as $element) {
            $this->_fallback[] = $element;
            $this->addChild($element);
        }
    }

    public function read(IConvoRequest $request, IConvoResponse $response): void
    {
        if (!($response instanceof IConvoAudioResponse)) {
            $this->_logger->info('Not an IConvoAudioResponse. Exiting ...');
            return ;
        }

        /** @var IConvoAudioResponse $response */
        $context = $this->_getMediaSourceContext();

        $songs = $context->getSongs();
        $searchTerm = $this->evaluateString($this->_searchTerm);
        // force string value since some artists have names only in numbers like 1919, 999
        $searchTerm = strval($searchTerm);

        $params = $this->getService()->getComponentParams(IServiceParamsScope::SCOPE_TYPE_REQUEST, $this);
        $params->setServiceParam($this->evaluateString($this->_mediaInfoVar), $context->getMediaInfo());

        $this->_logger->info('Going to seek to track index by search term [' . $searchTerm . ']');
        $index = $this->_getSongIndex($songs, $searchTerm);
        $this->_logger->info('Going to play song at index [' . $index . '] ...');

        if ($index < 0) {
            $this->_logger->warning('Correcting negative -1 index to 0 ...');
            $index = 0;
        }

        try {
            $context->seek($index);
            $response->playSong($context->current());
            $context->setPlaying();
        } catch (DataItemNotFoundException $e) {
            $this->_logger->notice($e->getMessage());

            if (!empty($this->_fallback)) {
                foreach ($this->_fallback as $element) {
                    $element->read($request, $response);
                }
            }
        }
    }

    /**
     * @param iterable<int, IAudioFile> $songData
     */
    private function _getSongIndex(iterable $songData, string $searchTerm): int
    {
        $searchQueryRating = [];
        foreach ($songData as $key => $song) {
            /** @var IAudioFile $song */
            $cleanSongData = preg_replace('/[^\da-z ]/i', '', $song->getArtist() . ' ' . $song->getSongTitle());
            $fuzzyMatchScore = $this->_getSearchTermMatchScore(
                preg_split('/\s+/', strtolower($searchTerm), -1, PREG_SPLIT_NO_EMPTY) ?: [],
                preg_split('/\s+/', strtolower((string) $cleanSongData), -1, PREG_SPLIT_NO_EMPTY) ?: []
            );
            // add fuzzy match score in case when more than 50 percent of the words matches the query
            if ($fuzzyMatchScore > 50) {
                $searchQueryRating[$key] = $fuzzyMatchScore;
            }
        }

        $index = -1;
        if (!empty($searchQueryRating)) {
            $largestTextSimilarity = max($searchQueryRating);
            $index = array_search($largestTextSimilarity, $searchQueryRating);
        }

        return $index;
    }

    /**
     * @param string[] $queryWords
     * @param string[] $targetWords
     */
    private function _getSearchTermMatchScore(array $queryWords, array $targetWords): float
    {
        $score = 0.0;
        $queryWordsCount = 0;
        $matchedQueryWordsCount = 0;

        foreach ($queryWords as $queryWord) {
            $queryWordsCount++;
            foreach ($targetWords as $targetWord) {
                similar_text($queryWord, $targetWord, $percentage);
                if ($percentage > 75) {
                    $matchedQueryWordsCount++;
                    $score += round($percentage, 2);
                }
            }
        }

        if ($queryWordsCount === 0) {
            return 0.0;
        }

        $missedQueryWordsPercentage = round(($matchedQueryWordsCount / $queryWordsCount) * 100, 2) * ($queryWordsCount - $matchedQueryWordsCount);
        $score -= $missedQueryWordsPercentage;

        // logging…

        return $score;
    }

    /**
     * @return IMediaSourceContext
     */
    private function _getMediaSourceContext()
    {
        return $this->getService()->findContext(
            $this->evaluateString($this->_contextId),
            IMediaSourceContext::class
        );
    }
}
