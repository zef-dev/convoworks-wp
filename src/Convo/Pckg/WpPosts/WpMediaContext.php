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
     * @return \WP_Query
     */
    public function getWpQuery()
    {
        $args   =   [
            's' => '',
            'post_type' => 'attachment',
            'posts_per_page' => 10,
            'offset' => 0,
            'paged' => true,
        ];
        
        $query     =   new \WP_Query( $args);
        return $query;
    }

    /**
     * @inheritDoc
     */
    public function list(): iterable
    {
        $files  =   [];
        $query  =   $this->getWpQuery();
        
        foreach ( $query->posts as $post) {
            $filename = basename ( get_attached_file( $post->ID ) );
            $files[] = new Mp3File( $filename, $post->guid, [], '');
        }
        
        return $files;
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
        return $this->list();
    }



    /**
     * @inheritDoc
     */
    public function current(): Mp3File
    {
        foreach ( $this->list() as $mp3) {
            return $mp3;
        }
        throw new DataItemNotFoundException( 'No current song');
    }

    /**
     * @inheritDoc
     */
    public function next(): Mp3File
    {
        foreach ( $this->list() as $mp3) {
            return $mp3;
        }
        throw new DataItemNotFoundException( 'No next song');
    }

    /**
     * @inheritDoc
     */
    public function previous(): Mp3File
    {
        foreach ( $this->list() as $mp3) {
            return $mp3;
        }
        throw new DataItemNotFoundException( 'No previous song');
    }

    public function first(): Mp3File
    {
        foreach ( $this->list() as $mp3) {
            return $mp3;
        }
        throw new DataItemNotFoundException( 'No first song');
    }

    public function last(): Mp3File
    {
        foreach ( $this->list() as $mp3) {
            return $mp3;
        }
        throw new DataItemNotFoundException( 'No last song');
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
