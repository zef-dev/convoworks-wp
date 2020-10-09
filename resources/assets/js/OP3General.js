import MovingBorderMenu from "./Menu/MovingBorderMenu";
import CollapsibleMenu from "./Menu/CollapsibleMenu";
import Menus from "./Menu/Menus";
import 'jquery-confirm'
import OP3MovingImage from "./Element/MovingImage";
import OP3Dialog from "./General/Dialog";

class OP3General {
    constructor() {
        this.menus = null;
        this.pages = {};
        this.mainMenu = this.createMovingBorderMenu('.op3-main-menu');

        this['jQueryInit']();
    }

    /**
     * jQuery initialization
     */
    ['jQueryInit']() {
        let _this = this;
        let $ = jQuery;

        $(document).ready(() => {
            _this.menus = new Menus($);
        });
    }

    /**
     * Get default options for dialog
     *
     * @return {Object}
     */
    get dialogOptions() {
        return OP3Dialog.dialogOptions;
    }

    /**
     * Get jquery-confirm dialog
     *
     * @return {$.dialog}
     */
    get dialog() {
        return OP3Dialog.dialog;
    }

    /**
     * Get jquery-confirm confirm
     *
     * @return {$.confirm}
     */
    get confirm() {
        return OP3Dialog.confirm;
    }

    /**
     * Get jquery-confirm alert
     *
     * @return {$.alert}
     */
    get alert() {
        return OP3Dialog.alert;
    }

    /**
     * Create dialog with alert display type
     *
     * @param {string} title
     * @param {string} content
     * @param {string} redirectUrl
     * @return {$.dialog}
     */
    createAlert(title, content, redirectUrl = '') {
        return OP3Dialog.createAlert(title, content, redirectUrl);
    }

    /**
     * Create dialog with success display type
     *
     * @param {string} title
     * @param {string} content
     * @param {string} redirectUrl
     * @return {$.dialog}
     */
    createSuccess(title, content, redirectUrl = '') {
        return OP3Dialog.createSuccess(title, content, redirectUrl);
    }

    /**
     * Creates Moving Border Menu
     *
     * @param {string} selector
     * @param {boolean} preventClick
     * @return {MovingBorderMenu}
     */
    createMovingBorderMenu(selector, preventClick = false) {
        return new MovingBorderMenu(selector, preventClick);
    }

    /**
     * Creates Collapsible Menu
     *
     * @param {string} selector
     * @return {CollapsibleMenu}
     */
    createCollapsibleMenu(selector) {
        return new CollapsibleMenu(selector);
    }

    /**
     * Creates image that is scrolling down when image is bigger then container
     *
     * @param {string} selector
     * @param {jQuery} $
     * @return {OP3MovingImage}
     */
    createMovingImage(selector, $) {
        return new OP3MovingImage(selector, $);
    }
}

export default OP3General;

window.OP3General = new OP3General();
