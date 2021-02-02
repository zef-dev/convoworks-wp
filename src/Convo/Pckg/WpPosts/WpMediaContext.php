<?php


namespace ConvoPlugin\Convo\Pckg\WpPosts;


use Convo\Core\DataItemNotFoundException;
use Convo\Core\Params\IServiceParamsScope;
use Convo\Core\Media\Mp3File;
use Convo\Core\Workflow\AbstractBasicComponent;
use Convo\Core\Workflow\IMediaSourceContext;
use wapmorgan\Mp3Info\Mp3Info;

class WpMediaContext extends AbstractBasicComponent implements IMediaSourceContext
{
    const NOT_FOUND = 'not_found';

    private $_id;

    /** @var boolean */
    private $_shouldMovePonter = true;

    /**
     * @var array
     */
    private $_searchQuery = [];

    /**
     *
     * @var \Psr\Log\LoggerInterface
     */
    protected $_logger;

    public function __construct( $properties)
    {
        parent::__construct( $properties);
        $this->_id  =   $properties['id'];
    }

    /**
     * @inheritDoc
     */
    public function list(): iterable
    {
        return [];
    }
    
    public function setSearchQuery( $searchQuery)
    {
        $this->_logger->debug("Setting query...");
        $this->_searchQuery = $searchQuery;
    }
    
    public function setShouldMovePointer( $shouldMovePointer = true)
    {
        $this->_shouldMovePonter = $shouldMovePointer;
    }

    /**
     * @inheritDoc
     */
    public function find(): iterable
    {
        $filteredSongsList = [];
        return $filteredSongsList;
    }



    /**
     * @inheritDoc
     */
    public function current(): Mp3File
    {
        $song = new Mp3File('', '', [], '');
        return $song;
    }

    /**
     * @inheritDoc
     */
    public function next(): Mp3File
    {
        $song = new Mp3File('', '', [], '');
        return $song;
    }

    /**
     * @inheritDoc
     */
    public function previous(): Mp3File
    {
        $song = new Mp3File('', '', [], '');
        return $song;
    }

    public function first(): Mp3File
    {
        $song = new Mp3File('', '', [], '');
        return $song;
    }

    public function last(): Mp3File
    {
        $song = new Mp3File('', '', [], '');
        return $song;
    }

    /**
     * @inheritDoc
     */
    public function setOffset( $offset)
    {
        $this->_getServiceParams()->setServiceParam("current_song_offset", $offset);
    }

    /**
     * @inheritDoc
     */
    public function getOffset(): int
    {
        $currentSongOffsetFromInstallation = $this->_getServiceParams()->getServiceParam("current_song_offset");

        if (is_numeric($currentSongOffsetFromInstallation)) {
            return $currentSongOffsetFromInstallation;
        }

        return 0;
    }

    public function movePointerTo( $index)
    {
    }

    public function getPointerPosition(): int
    {
        return 0;
    }

    public function setLoopStatus( $loopStatus)
    {
        $this->_getServiceParams()->setServiceParam('loop_status', $loopStatus);
    }

    public function getLoopStatus(): bool
    {
        return $this->_getServiceParams()->getServiceParam('loop_status') ? $this->_getServiceParams()->getServiceParam('loop_status') : false;
    }



    /**
     * @inheritDoc
     */
    public function init()
    {
    }

    /**
     * @inheritDoc
     */
    public function getId()
    {
        return $this->_id;
    }

    /**
     * @inheritDoc
     */
    public function getComponent()
    {
        return $this;
    }
}
