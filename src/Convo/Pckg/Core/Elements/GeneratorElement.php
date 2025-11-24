<?php

declare(strict_types=1);

namespace Convo\Pckg\Core\Elements;

use Convo\Core\Workflow\AbstractWorkflowContainerComponent;
use Convo\Core\Workflow\IConversationElement;
use Convo\Core\Workflow\IElementGenerator;

class GeneratorElement extends AbstractWorkflowContainerComponent implements IElementGenerator
{
    /**
     * @var IConversationElement
     */
    private $_element;

    private $_dataCollection;

    private $_item;

    /**
     * @var \Iterator
     */
    private $_iterator;


    public function __construct($properties)
    {
        parent::__construct($properties);

        $this->_dataCollection = $properties['data_collection'];
        $this->_item = $properties['item'];

        if ($properties['element']) {
            $this->_element = $properties['element'];
        }
    }

    // ITERATOR
    public function next() : void
    {
        $this->_iterator->next();
    }

    public function valid() : bool
    {
        return $this->_iterator->valid();
    }

    public function current() : GeneratorItem
    {
        $slot_name = $this->evaluateString($this->_item);
        $item = $this->_iterator->current();

        $item = new GeneratorItem($this->_element, $slot_name, [
            'value' => $item,
            'index' => $this->_iterator->key(),
            'natural' => $this->_iterator->key() + 1,
            'first' => $this->_iterator->key() === 0,
        ]);
        $item->setService($this->getService());
        $this->addChild($item);
        return $item;
    }

    public function rewind() : void
    {
        $items = $this->evaluateString($this->_dataCollection);

        if (!is_array($items) && !$items instanceof \Iterator && !$items instanceof \IteratorAggregate) {
            throw new \Exception('Excepted to find iterable for [' . $this->_dataCollection . '] got [' . gettype($items) . ']');
        }

        if (is_array($items)) {
            $this->_iterator = new \ArrayIterator($items);
        } elseif ($items instanceof \IteratorAggregate) {
            $iterator = $items->getIterator();
            if (!$iterator instanceof \Iterator) {
                throw new \Exception('IteratorAggregate::getIterator() must return Iterator');
            }
            /** @phpstan-var \Iterator $iterator */
            $this->_iterator = $iterator;
        } else {
            $this->_iterator = $items;
        }
    }

    public function key() : mixed
    {
        return $this->_iterator->key();
    }


    // UTIL
    public function __toString()
    {
        return parent::__toString() . '[]';
    }
}
