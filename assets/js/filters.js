(function ($) {
	'use strict';

	/**
	 * Build select element with options.
	 */
	function buildSelect(items, name, selected, placeholder) {
		var $sel = $('<select>').addClass('tec-simple-filters-select').attr('data-name', name);
		$sel.append($('<option>').attr('value', '').text(placeholder));

		items.forEach(function (it) {
			var val = it.id || it;
			var labelItem = it.name || it;
			var $o = $('<option>').attr('value', val).text(labelItem);
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
			var $eventsBar = $('.tribe-events-c-events-bar');
			if (!$eventsBar.length) {
				return;
			}

			var filterConfig = TecSimpleFiltersData.config || [];
			if (!filterConfig.length) {
				$('.tec-simple-filters-row').remove();
				return;
			}

			var filterKeys = filterConfig.map(function (c) { return c.key; });

			// Cleanup
			$('.tec-simple-filters-row').remove();

			var $container = $('<div>').addClass('tec-simple-filters-row');
			var $inner = $('<div>').addClass('tec-simple-filters-container');
			var q = getQueryVal;

			filterConfig.forEach(function (cfg) {
				var $formControl = $('<div>').addClass('tribe-common-form-control-select tec-simple-filter-control');
				var $label = $('<label>')
					.addClass('tribe-common-form-control-select__label')
					.attr('for', 'tec-filter-' + cfg.key)
					.text(cfg.label);

				var $sel = buildSelect(TecSimpleFiltersData[cfg.list] || [], cfg.key, q(cfg.key), cfg.placeholder)
					.addClass('tribe-common-form-control-select__input tribe-common-form-control__input')
					.attr('id', 'tec-filter-' + cfg.key);

				$formControl.append($label).append($sel);
				$inner.append($formControl);
			});

			var $clear = $('<button>')
				.attr('type', 'button')
				.addClass('tribe-common-c-btn tribe-common-c-btn__clear tec-simple-filters-clear-btn')
				.text('Clear');

			$inner.append($clear);

			$container.append($inner);

			// Add searchable class if many options
			$container.find('select').each(function () {
				if ($(this).find('option').length > 20) {
					$(this).addClass('tribe-select--searchable');
				}
			});

			// Inject into the events bar
			$eventsBar.append($container);

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
