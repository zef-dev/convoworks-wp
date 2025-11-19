/**
 * Installation Variables Admin Page JavaScript
 */
(function() {
    'use strict';

    document.addEventListener('DOMContentLoaded', function() {
        var editToggles = document.querySelectorAll('.convowp-vars-page .edit-toggle');
        var cancelButtons = document.querySelectorAll('.convowp-vars-page .cancel-edit');

        // Handle edit toggle clicks
        editToggles.forEach(function(toggle) {
            toggle.addEventListener('click', function(e) {
                e.preventDefault();
                var formId = this.getAttribute('data-form-id');
                var formRow = document.getElementById(formId + '-row');
                
                if (formRow) {
                    if (formRow.classList.contains('show')) {
                        formRow.classList.remove('show');
                    } else {
                        // Hide all other edit forms first
                        document.querySelectorAll('.convowp-vars-page .edit-form-row.show').forEach(function(row) {
                            row.classList.remove('show');
                        });
                        formRow.classList.add('show');
                        
                        // Focus on textarea after a short delay
                        var textarea = formRow.querySelector('textarea');
                        if (textarea) {
                            setTimeout(function() {
                                textarea.focus();
                            }, 100);
                        }
                    }
                }
            });
        });

        // Handle cancel button clicks
        cancelButtons.forEach(function(button) {
            button.addEventListener('click', function(e) {
                e.preventDefault();
                var formId = this.getAttribute('data-form-id');
                var formRow = document.getElementById(formId + '-row');
                
                if (formRow) {
                    formRow.classList.remove('show');
                }
            });
        });
    });
})();

