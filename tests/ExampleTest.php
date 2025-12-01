<?php

namespace Convo\Wp\Tests;

use Convo\Wp\Tests\ConvoTestCase;

class ExampleTest extends ConvoTestCase
{
    /**
     * Test basic assertion
     */
    public function testBasicAssertion()
    {
        $this->assertTrue(true);
        $this->assertEquals(2, 1 + 1);
    }

    /**
     * Test string operations
     */
    public function testStringOperations()
    {
        $str = "Hello Convoworks";
        $this->assertStringContainsString("Convoworks", $str);
        $this->assertEquals(16, strlen($str));
    }

    /**
     * Test array operations
     */
    public function testArrayOperations()
    {
        $array = [1, 2, 3, 4, 5];
        $this->assertCount(5, $array);
        $this->assertContains(3, $array);
        $this->assertEquals(1, $array[0]);
    }

    /**
     * Test that logger is set up correctly
     */
    public function testLoggerSetup()
    {
        $this->assertNotNull($this->_logger);
        $this->assertInstanceOf(\Convo\Core\Util\EchoLogger::class, $this->_logger);
    }
}
