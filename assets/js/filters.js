(function ($) {
	'use strict';

	var MOBILE_MQ = window.matchMedia('(max-width: 768px)');
	var instanceCounter = 0;

	function nextInstanceId() {
		instanceCounter += 1;
		return 'tec-simple-filters-' + instanceCounter;
	}

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
		var filtersExpanded = false;
		var lastState = null;
		var i18n = TecSimpleFiltersData.i18n || {};

		function getQueryVal(key) {
			var params = lastState || new URLSearchParams(window.location.search);
			return params.get(key) || '';
		}

		function countActiveFilters(filterKeys, q) {
			return filterKeys.filter(function (k) {
				return q(k);
			}).length;
		}

		function updateToggleState($row, $toggle, expanded) {
			$row.toggleClass('tec-simple-filters-row--open', expanded);
			$toggle.attr('aria-expanded', expanded ? 'true' : 'false');
			$toggle.attr('aria-label', expanded
				? (i18n.toggleCollapse || 'Hide filters')
				: (i18n.toggleExpand || 'Show filters'));
		}

		function setAllToggleStates(expanded) {
			$('.tec-simple-filters-row').each(function () {
				var $row = $(this);
				updateToggleState($row, $row.find('.tec-simple-filters-toggle').first(), expanded);
			});
		}

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

				lastState = target.searchParams;
				renderFilters();

				var manager = window.tribe && tribe.events && tribe.events.views && tribe.events.views.manager;
				var $container = $('[data-js="tribe-events-view"]');

				if (manager && typeof manager.request === 'function' && $container.length) {
					manager.request({
						url: target.href,
						prev_url: current.href,
						should_manage_url: true
					}, $container);

					setTimeout(function () { isNavigating = false; }, 1000);
				} else {
					window.location.href = target.href;
				}
			}, 50);
		}

		function renderFilters() {
			var $eventsBars = $('.tribe-events-c-events-bar');
			if (!$eventsBars.length) {
				return;
			}

			var filterConfig = TecSimpleFiltersData.config || [];
			if (!filterConfig.length) {
				$('.tec-simple-filters-row').remove();
				return;
			}

			var filterKeys = filterConfig.map(function (c) { return c.key; });
			var q = getQueryVal;
			var activeCount = countActiveFilters(filterKeys, q);

			$('.tec-simple-filters-row').remove();

			$eventsBars.each(function () {
				var $eventsBar = $(this);
				var instanceId = nextInstanceId();
				var panelId = instanceId + '-panel';

				var $container = $('<div>').addClass('tec-simple-filters-row');
				var $toggle = $('<button>')
					.attr('type', 'button')
					.addClass('tec-simple-filters-toggle')
					.attr('aria-controls', panelId)
					.attr('aria-expanded', 'false');

				var $toggleLabel = $('<span>').addClass('tec-simple-filters-toggle__label')
					.text(i18n.toggleLabel || 'Filters');

				if (activeCount) {
					$toggleLabel.append(
						$('<span>').addClass('tec-simple-filters-toggle__count').text(activeCount)
					);
				}

				$toggle.append($toggleLabel).append($('<span>').addClass('tec-simple-filters-toggle__icon').attr('aria-hidden', 'true'));

				var $inner = $('<div>')
					.addClass('tec-simple-filters-container')
					.attr('id', panelId);

				filterConfig.forEach(function (cfg) {
					var fieldId = instanceId + '-filter-' + cfg.key;
					var $formControl = $('<div>').addClass('tribe-common-form-control-select tec-simple-filter-control');
					var $label = $('<label>')
						.addClass('tribe-common-form-control-select__label')
						.attr('for', fieldId)
						.text(cfg.label);

					var $sel = buildSelect(TecSimpleFiltersData[cfg.list] || [], cfg.key, q(cfg.key), cfg.placeholder)
						.addClass('tribe-common-form-control-select__input tribe-common-form-control__input')
						.attr('id', fieldId);

					$formControl.append($label).append($sel);
					$inner.append($formControl);
				});

				var $clear = $('<button>')
					.attr('type', 'button')
					.addClass('tribe-common-c-btn tribe-common-c-btn__clear tec-simple-filters-clear-btn')
					.text('Clear');

				$inner.append($clear);
				$container.append($toggle).append($inner);

				if (!MOBILE_MQ.matches) {
					$container.find('select').each(function () {
						if ($(this).find('option').length > 20) {
							$(this).addClass('tribe-select--searchable');
						}
					});
				}

				$eventsBar.append($container);
				updateToggleState($container, $toggle, filtersExpanded);

				$toggle.on('click', function (e) {
					e.preventDefault();
					filtersExpanded = !filtersExpanded;
					setAllToggleStates(filtersExpanded);
				});

				$container.on('change', 'select', function (e) {
					e.preventDefault();
					var params = new URLSearchParams(window.location.search);
					$container.find('select').each(function () {
						var n = $(this).data('name');
						var v = $(this).val();
						if (v) {
							params.set(n, v);
						} else {
							params.delete(n);
						}
					});

					var targetUrl = new URL(window.location.href);
					params.forEach(function (v, k) {
						targetUrl.searchParams.set(k, v);
					});

					filterKeys.forEach(function (k) {
						if (!params.has(k)) {
							targetUrl.searchParams.delete(k);
						}
					});

					navigate(targetUrl.href);
				});

				$clear.on('click', function (e) {
					e.preventDefault();
					e.stopPropagation();

					var targetUrl = new URL(window.location.href);
					filterKeys.forEach(function (k) {
						targetUrl.searchParams.delete(k);
					});

					navigate(targetUrl.href);
				});
			});
		}

		renderFilters();

		$(document).on('afterAjaxSuccess.tribeEvents', function () {
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
