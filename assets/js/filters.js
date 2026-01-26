(function ($) {
    'use strict';

    /**
     * Build select element with options.
     */
    function buildSelect(items, name, selected) {
        var $sel = $('<select>').addClass('tec-simple-filters-select').attr('data-name', name);
        $sel.append($('<option>').attr('value', '').text(name.replace(/tec_/g, '').replace(/_/g, ' ').toUpperCase()));

        items.forEach(function (it) {
            var val = it.id || it;
            var label = it.name || it;
            var $o = $('<option>').attr('value', val).text(label);
            // Loose comparison to handle numeric strings vs numbers
            if (val && selected && String(val) === String(selected)) {
                $o.prop('selected', true);
            }
            $sel.append($o);
        });

        return $sel;
    }

    function init() {
        if (typeof TecSimpleFiltersData === 'undefined') {
            return;
        }

        var isNavigating = false;
        var navTimeout = null;

        // Navigation guard to keep selected state during AJAX transitions
        var lastState = null;

        /**
         * Get current query value, prioritizing the last state we navigated to
         */
        function getQueryVal(key) {
            var params = lastState || new URLSearchParams(window.location.search);
            return params.get(key) || '';
        }

        /**
         * Trigger AJAX or Full-page navigation.
         */
        function navigate(newUrl) {
            var target = new URL(newUrl, window.location.origin);
            var current = new URL(window.location.href);

            if (target.href === current.href) {
                return;
            }

            if (isNavigating) {
                return;
            }

            if (navTimeout) {
                clearTimeout(navTimeout);
            }

            navTimeout = setTimeout(function () {
                navTimeout = null;
                isNavigating = true;

                // LOCK selective state before request
                lastState = target.searchParams;
                renderFilters();

                var manager = window.tribe && tribe.events && tribe.events.views && tribe.events.views.manager;
                var $container = $('[data-js="tribe-events-view"]');

                if (manager && typeof manager.request === 'function' && $container.length) {
                    var data = {
                        url: target.href,
                        prev_url: current.href,
                        should_manage_url: true
                    };

                    manager.request(data, $container);

                    // Reset guard after delay
                    setTimeout(function () { isNavigating = false; }, 1000);
                } else {
                    window.location.href = target.href;
                }
            }, 50);
        }

        /**
         * Build the filter UI.
         */
        function renderFilters() {
            var $topBar = $('.tribe-events-c-top-bar.tribe-events-header__top-bar');
            if (!$topBar.length) {
                $topBar = $('[data-js="tribe-events-view-selector"]').closest('.tribe-events-c-view-selector');
            }
            if (!$topBar.length) {
                return;
            }

            // Cleanup
            $topBar.find('.tribe-events-c-view-selector__filters').remove();

            var $container = $('<div>').addClass('tribe-events-c-view-selector__filters');
            var q = getQueryVal;

            [
                { list: 'categories', key: 'tribe_events_cat', label: 'Category' },
                { list: 'tags', key: 'tag', label: 'Tag' },
                { list: 'venues', key: 'tec_venue', label: 'Venue' },
                { list: 'organizers', key: 'tec_organizer', label: 'Organizer' },
                { list: 'cities', key: 'tec_venue_city', label: 'City' },
                { list: 'states', key: 'tec_venue_state', label: 'State / Province' }
            ].forEach(function (cfg) {
                var $label = $('<label>').addClass('tribe-common-form-control-select').text(cfg.label);
                var $sel = buildSelect(TecSimpleFiltersData[cfg.list] || [], cfg.key, q(cfg.key))
                    .addClass('tribe-common-form-control__input')
                    .attr('id', 'tec-filter-' + cfg.key);
                $label.append($sel);
                $container.append($label);
            });

            var $clear = $('<button>')
                .attr('type', 'button')
                .addClass('tribe-common-c-btn tribe-common-c-btn__clear tec-simple-filters-clear-btn')
                .text('Clear');

            $container.append($clear);

            $container.find('select').each(function () {
                if ($(this).find('option').length > 20) {
                    $(this).addClass('tribe-select--searchable');
                }
            });

            $topBar.append($container);

            // Bind change
            $container.off('change').on('change', 'select', function (e) {
                e.preventDefault();
                var params = new URLSearchParams(window.location.search);
                $container.find('select').each(function () {
                    var n = $(this).data('name');
                    var v = $(this).val();
                    if (v) params.set(n, v); else params.delete(n);
                });

                var targetUrl = new URL(window.location.href);
                params.forEach(function (v, k) {
                    targetUrl.searchParams.set(k, v);
                });
                var filterKeys = ['tribe_events_cat', 'tag', 'tec_venue', 'tec_organizer', 'tec_venue_city', 'tec_venue_state'];
                filterKeys.forEach(function (k) {
                    if (!params.has(k)) targetUrl.searchParams.delete(k);
                });

                navigate(targetUrl.href);
            });

            // Bind Clear
            $clear.off('click').on('click', function (e) {
                e.preventDefault();
                e.stopPropagation();

                var targetUrl = new URL(window.location.href);
                var filterKeys = ['tribe_events_cat', 'tag', 'tec_venue', 'tec_organizer', 'tec_venue_city', 'tec_venue_state'];
                filterKeys.forEach(function (k) {
                    targetUrl.searchParams.delete(k);
                });

                navigate(targetUrl.href);
            });
        }

        // Initial render
        renderFilters();

        /**
         * Re-render when TEC view updates.
         */
        $(document).on('afterAjaxSuccess.tribeEvents', function () {
            // Unset the locked state so we refresh from the actual updated URL
            lastState = null;
            setTimeout(renderFilters, 25);
        });

        var observer = new MutationObserver(function (mutations) {
            var shouldRender = false;
            mutations.forEach(function (m) {
                if (m.addedNodes && m.addedNodes.length) {
                    for (var i = 0; i < m.addedNodes.length; i++) {
                        var node = m.addedNodes[i];
                        if (node instanceof Element && (node.matches('.tribe-events-header') || node.querySelector('.tribe-events-header'))) {
                            shouldRender = true;
                            break;
                        }
                    }
                }
            });
            if (shouldRender) {
                setTimeout(renderFilters, 35);
            }
        });
        observer.observe(document.body, { childList: true, subtree: true });
    }

    $(document).ready(init);
})(jQuery);
