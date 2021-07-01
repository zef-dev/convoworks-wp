<?php declare(strict_types=1);

namespace Convo\Wp\Pckg\WpPluginPack;

use Convo\Core\Util\IHttpFactory;
use Convo\Core\Workflow\IConvoRequest;
use Convo\Core\Workflow\IConvoResponse;
use Convo\Trivia\Wp\Answer;
use Convo\Trivia\Wp\Question;

class OpenTDBTriviaAdapterElement extends \Convo\Core\Workflow\AbstractWorkflowContainerComponent implements \Convo\Core\Workflow\IConversationElement
{
    const BASE_URL = 'https://opentdb.com/api.php';
   
    /**
     * HTTP Factory
     * @var \Convo\Core\Util\IHttpFactory
     */
    private $_httpFactory;

    private $_amount;
    private $_category;

    private $_scopeType;
    private $_scopeName;

    /**
     * @var \Convo\Core\Workflow\IConversationElement[]
     */
    private $_ok = [];

    /**
     * @var \Convo\Core\Workflow\IConversationElement[]
     */
    private $_nok = [];

    public function __construct($properties, $httpFactory)
    {
        parent::__construct($properties);

        $this->_httpFactory = $httpFactory;

        $this->_amount = $properties['amount'];
        $this->_category = $properties['category'];

        $this->_scopeType = $properties['scope_type'];
        $this->_scopeName = $properties['scope_name'];

        foreach ($properties['ok'] as $element) {
	        $this->_ok[] = $element;
	        $this->addChild($element);
	    }
    	
	    foreach ($properties['nok'] as $element) {
	        $this->_nok[] = $element;
	        $this->addChild($element);
	    }
    }

    public function read(IConvoRequest $request, IConvoResponse $response)
    {
        $http_client = $this->_httpFactory->getHttpClient();

        $uri = $this->_httpFactory->buildUri(
            self::BASE_URL,
            [
                'amount' => $this->evaluateString($this->_amount),
                'category' => $this->evaluateString($this->_category),
                'type' => 'multiple'
            ]
        );

        $res = $http_client->sendRequest(
            $this->_httpFactory->buildRequest(IHttpFactory::METHOD_GET, $uri)
        );

        if ($res->getStatusCode() !== 200) {
            $this->_logger->error('Could not fetch trivia: '.$res->getReasonPhrase());
            
            foreach ($this->_nok as $nok) {
                $nok->read($request, $response);
            }

            return;
        }

        $result = json_decode($res->getBody()->__toString(), true);

        $this->_logger->info('Got response trivia ['.print_r($result, true).']');

        $questions = [];

        foreach ($result['results'] as $item)
        {
            $cw_answers = [];

            $letters = array_rand(array_flip(['a', 'b', 'c', 'd']), 4);

            $cw_answers[] = new Answer($item['correct_answer'], array_shift($letters), true);

            foreach ($item['incorrect_answers'] as $answer) {
                $cw_answers[] = new Answer($answer, array_shift($letters), false);
            }

            shuffle($cw_answers);
            $questions[] = new Question($item['question'], $cw_answers);
        }

        $params = $this->getService()->getServiceParams($this->evaluateString($this->_scopeType));
        $params->setServiceParam($this->evaluateString($this->_scopeName), array_map(function ($q) { return $q->getData(); }, $questions));

        foreach ($this->_ok as $ok) {
            $ok->read($request, $response);
        }
    }
}