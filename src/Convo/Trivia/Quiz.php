<?php declare(strict_types=1);

namespace Convo\Trivia;

class Quiz
{
    /**
     * Questions for this quiz
     * @var Question[]
     */
    private $_questions;

    public function __construct($questions)
    {
        $this->_questions = $questions;
    }

    public function getData()
    {
        $data = [
            'questions' => []
        ];

        foreach ($this->_questions as $question)
        {
            $data['questions'][] = $question->getData();
        }

        return $data;
    }
}