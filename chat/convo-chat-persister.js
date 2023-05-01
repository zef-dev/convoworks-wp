/* @ngInject */
export default function ConvoChatPersister( $log, $window)
{
    this.isOpen = isOpen;
    this.setOpen = setOpen;
    this.setClosed = setClosed;

    function isOpen( sessionId)
    {
        return false;
    }

    function setOpen( sessionId)
    {
    }

    function setClosed( sessionId)
    {
    }
};
