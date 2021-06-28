<?php declare(strict_types=1);

namespace Convo\Trivia;

class Question
{
    private $_text;

    /**
     * Possible answers for this question
     * @var Answer[]
     */
    private $_answers;

    public function __construct($text, $answers)
    {
        $this->_text = $text;

        $this->_answers = $answers;
    }

    public function getText()
    {
        return $this->_text;
    }

    public function getAnswers()
    {
        return $this->_answers;
    }

    public function getCorrectAnswer()
    {
        foreach ($this->_answers as $answer)
        {
            if ($answer->isCorrect()) {
                return $answer;
            }
        }

        throw new \Exception('Question has no correct answer.');
    }

    public function getData()
    {
        $data = [
            'text' => $this->_text,
            'answers' => [],
            'correct_answer' => $this->getCorrectAnswer()->getData()
        ];

        foreach ($this->_answers as $answer)
        {
            $data['answers'][] = $answer->getData();
        }

        return $data;
    }

    public function __toString()
    {
        return get_class($this).'['.$this->_text.']['.print_r($this->_answers, true).']';
    }
}