<?php declare(strict_types=1);

namespace Convo\Trivia\Wp;

class Answer
{
    private $_text;

    private $_letter;

    private $_isCorrect;

    public function __construct($text, $letter, $isCorrect)
    {
        $this->_text = $text;
        $this->_letter = $letter;

        $this->_isCorrect = $isCorrect;
    }

    public function getText()
    {
        return $this->_text;
    }

    public function getLetter()
    {
        return $this->_letter;
    }

    public function isCorrect()
    {
        return $this->_isCorrect;
    }

    public function getData()
    {
        return [
            'text' => $this->_text,
            'letter' => $this->_letter,
            'is_correct' => $this->_isCorrect
        ];
    }

    public function __toString()
    {
        return get_class($this).'['.$this->_text.']['.$this->_letter.']['.($this->_isCorrect ? 'correct' : 'incorrect').']';
    }
}