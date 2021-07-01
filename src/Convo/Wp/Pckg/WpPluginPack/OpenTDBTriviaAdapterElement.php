<?php declare(strict_types=1);

namespace Convo\Wp\Pckg\WpPluginPack;

use Convo\Core\Util\IHttpFactory;
use Convo\Core\Workflow\IConvoRequest;
use Convo\Core\Workflow\IConvoResponse;
use Convo\Trivia\Wp\Answer;
use Convo\Trivia\Wp\Question;

use function PHPSTORM_META\map;

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

    public function __construct($properties, $httpFactory)
    {
        parent::__construct($properties);

        $this->_httpFactory = $httpFactory;

        $this->_amount = $properties['amount'];
        $this->_category = $properties['category'];

        $this->_scopeType = $properties['scope_type'];
        $this->_scopeName = $properties['scope_name'];
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
            throw new \Exception('Could not fetch trivia: '.$res->getReasonPhrase());
        }

        $result = json_decode($res->getBody()->__toString(), true);

        $this->_logger->info('Got response trivia ['.print_r($result, true).']');

        $questions = [];

        foreach ($result['results'] as $item)
        {
            $cw_answers = [];

            $letters = array_rand(array_flip(['a', 'b', 'c', 'd']), 4);

            $cw_answers[] = new Answer($item['correct_answer'], array_unshift($letters), true);

            foreach ($item['incorrect_answers'] as $answer) {
                $cw_answers[] = new Answer($answer, array_unshift($letters), false);
            }

            shuffle($cw_answers);
            $questions[] = new Question($item['question'], $cw_answers);
        }

        $params = $this->getService()->getServiceParams($this->evaluateString($this->_scopeType));
        $params->setServiceParam($this->evaluateString($this->_scopeName), array_map(function ($q) { return $q->getData(); }, $questions));
    }
}