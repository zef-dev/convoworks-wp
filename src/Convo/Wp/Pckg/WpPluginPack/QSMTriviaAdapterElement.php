<?php declare(strict_types=1);

namespace Convo\Wp\Pckg\WpPluginPack;

use Convo\Core\Workflow\IConvoRequest;
use Convo\Core\Workflow\IConvoResponse;
use Convo\Trivia\Wp\Answer;
use Convo\Trivia\Wp\Question;

class QSMTriviaAdapterElement extends \Convo\Core\Workflow\AbstractWorkflowContainerComponent implements \Convo\Core\Workflow\IConversationElement
{
    private $_quizId;

    private $_scopeType;
    private $_scopeName;

    const LETTERS = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z'];

    public function __construct($properties)
    {
        parent::__construct($properties);

        $this->_quizId = $properties['quiz_id'];

        $this->_scopeType = $properties['scope_type'];
        $this->_scopeName = $properties['scope_name'];
    }

    public function read(IConvoRequest $request, IConvoResponse $response)
    {
        $quiz_id = $this->evaluateString($this->_quizId);

        $questions = $this->_loadQuestions($quiz_id);

        $this->_logger->info('Got questions ['.print_r($questions, true).']');

        $data = [];

        foreach ($questions as $question) {
            $data[] = $question->getData();
        }

        $scope_type = $this->evaluateString($this->_scopeType);
        $scope_name = $this->evaluateString($this->_scopeName);

        $params = $this->getService()->getServiceParams($scope_type);
        $params->setServiceParam($scope_name, $data);
    }

    private function _loadQuestions($quizId)
    {
        global $wpdb;
        $cw_questions = [];

        $quiz_id = intval($quizId);
        $questions = $wpdb->get_results(
            $wpdb->prepare(
                "SELECT * FROM {$wpdb->prefix}mlw_questions WHERE quiz_id=%d AND deleted='0' ORDER BY question_order ASC",
                $quiz_id
            ),
            'ARRAY_A'
        );

        foreach ($questions as $i => $question)
        {
            $settings = maybe_unserialize($question['question_settings']);
            if (!$settings || !is_array($settings) || empty($settings) || count($settings) === 0) {
                $this->_logger->info('Question has no settings, meaning there is no title set. Skipping.');
                continue;
            }

            if (!in_array(intval($question['question_type_new']), [0, 1])) {
                $this->_logger->info('Question is not multiple choice, skipping.');
                continue;
            }

            $answers = maybe_unserialize($question['answer_array']);

            if (!$answers || !is_array($answers) || empty($answers) || count($answers) === 0) {
                $this->_logger->info('Question has no answers. Skipping.');
                continue;
            }
            
            foreach ($answers as $answer) {
                $cw_answers[] = new Answer($answer[0], self::LETTERS[$i % count(self::LETTERS)], ($answer[2] === 1)); 
            }

            $cw_questions[] = new Question($settings['question_title'], $cw_answers);
        }

        return $cw_questions;
    }
}
