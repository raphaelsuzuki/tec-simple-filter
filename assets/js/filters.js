( function ( $ ) {
    'use strict';

    function buildSelect( items, name, selected ) {
        var $sel = $( '<select>' ).addClass( 'tec-simple-filters-select' ).attr( 'data-name', name );
        $sel.append( $( '<option>' ).attr( 'value', '' ).text( name.replace( /tec_/g, '' ).replace( /_/g, ' ' ).toUpperCase() ) );
        items.forEach( function ( it ) {
            var $o = $( '<option>' ).attr( 'value', it.id || it ).text( it.name || it );
            if ( ( it.id && it.id === selected ) || ( it === selected ) ) {
                $o.prop( 'selected', true );
            }
            $sel.append( $o );
        } );
        return $sel;
    }

    function init() {
        if ( typeof TecSimpleFiltersData === 'undefined' ) {
            return;
        }

        var venues = TecSimpleFiltersData.venues || [];
        var organizers = TecSimpleFiltersData.organizers || [];
        var cities = TecSimpleFiltersData.cities || [];
        var states = TecSimpleFiltersData.states || [];
        var categories = TecSimpleFiltersData.categories || [];
        var tags = TecSimpleFiltersData.tags || [];

        // navigation guard and debounce to avoid rapid duplicate navigations
        var isNavigating = false;
        var navTimeout = null;

        // Render or re-render filters into the desired top bar container
        function renderFilters() {
            // Target the top bar container where controls should live
            var $topBar = $( '.tribe-events-c-top-bar.tribe-events-header__top-bar' );
            // fallback to view-selector container if topBar not present
            if ( ! $topBar.length ) {
                $topBar = $( '[data-js="tribe-events-view-selector"]' ).closest( '.tribe-events-c-view-selector' );
            }
            if ( ! $topBar.length ) {
                return;
            }

            // Remove existing instance to avoid duplicates
            $topBar.find( '.tribe-events-c-view-selector__filters' ).remove();

            var $container = $( '<div>' ).addClass( 'tribe-events-c-view-selector__filters' );

            // Categories and tags (before venue)
            var $catLabel = $( '<label>' ).addClass( 'tribe-common-form-control-select' ).text( 'Category' );
            var $catSel = buildSelect( categories, 'tribe_events_cat', TecSimpleFiltersData.query.tribe_events_cat ).addClass( 'tribe-common-form-control__input' ).attr( 'id', 'tec-filter-tribe_events_cat' ).attr( 'aria-label', 'Filter by category' );
            $catLabel.append( $catSel );

            var $tagLabel = $( '<label>' ).addClass( 'tribe-common-form-control-select' ).text( 'Tag' );
            var $tagSel = buildSelect( tags, 'tag', TecSimpleFiltersData.query.tag ).addClass( 'tribe-common-form-control__input' ).attr( 'id', 'tec-filter-tag' ).attr( 'aria-label', 'Filter by tag' );
            $tagLabel.append( $tagSel );

            var $venueLabel = $( '<label>' ).addClass( 'tribe-common-form-control-select' ).text( 'Venue' );
            var $venueSel = buildSelect( venues, 'tec_venue', TecSimpleFiltersData.query.venue ).addClass( 'tribe-common-form-control__input' ).attr( 'id', 'tec-filter-tec_venue' ).attr( 'aria-label', 'Filter by venue' );
            $venueLabel.append( $venueSel );

            var $organizerLabel = $( '<label>' ).addClass( 'tribe-common-form-control-select' ).text( 'Organizer' );
            var $organizerSel = buildSelect( organizers, 'tec_organizer', TecSimpleFiltersData.query.organizer ).addClass( 'tribe-common-form-control__input' ).attr( 'id', 'tec-filter-tec_organizer' ).attr( 'aria-label', 'Filter by organizer' );
            $organizerLabel.append( $organizerSel );

            var $cityLabel = $( '<label>' ).addClass( 'tribe-common-form-control-select' ).text( 'City' );
            var $citySel = buildSelect( cities, 'tec_venue_city', TecSimpleFiltersData.query.venue_city ).addClass( 'tribe-common-form-control__input' ).attr( 'id', 'tec-filter-tec_venue_city' ).attr( 'aria-label', 'Filter by city' );
            $cityLabel.append( $citySel );

            // State/province after city
            var $stateLabel = $( '<label>' ).addClass( 'tribe-common-form-control-select' ).text( 'State / Province' );
            var $stateSel = buildSelect( states, 'tec_venue_state', TecSimpleFiltersData.query.venue_state ).addClass( 'tribe-common-form-control__input' ).attr( 'id', 'tec-filter-tec_venue_state' ).attr( 'aria-label', 'Filter by state or province' );
            $stateLabel.append( $stateSel );

            $container.append( $catLabel ).append( $tagLabel ).append( $venueLabel ).append( $organizerLabel ).append( $cityLabel ).append( $stateLabel );

            var $clear = $( '<button>' ).addClass( 'tribe-common-c-btn tribe-common-c-btn__clear' ).text( 'Clear' );
            $container.append( $clear );

            // Add searchable hint for large selects
            $container.find( 'select' ).each( function () {
                if ( $( this ).find( 'option' ).length > 20 ) {
                    $( this ).addClass( 'tribe-select--searchable' );
                }
            } );

            // Append into top bar container
            $topBar.append( $container );

            // Event handlers
            $container.on( 'change', 'select', function () {
                // build params
                var params = new URLSearchParams( window.location.search );
                var cat = $container.find( 'select[data-name="tribe_events_cat"]' ).val();
                var tag = $container.find( 'select[data-name="tag"]' ).val();
                var venue = $container.find( 'select[data-name="tec_venue"]' ).val();
                var organizer = $container.find( 'select[data-name="tec_organizer"]' ).val();
                var city = $container.find( 'select[data-name="tec_venue_city"]' ).val();
                var state = $container.find( 'select[data-name="tec_venue_state"]' ).val();

                if ( cat ) {
                    params.set( 'tribe_events_cat', cat );
                } else {
                    params.delete( 'tribe_events_cat' );
                }

                if ( tag ) {
                    params.set( 'tag', tag );
                } else {
                    params.delete( 'tag' );
                }

                if ( venue ) {
                    params.set( 'tec_venue', venue );
                } else {
                    params.delete( 'tec_venue' );
                }

                if ( organizer ) {
                    params.set( 'tec_organizer', organizer );
                } else {
                    params.delete( 'tec_organizer' );
                }

                if ( city ) {
                    params.set( 'tec_venue_city', city );
                } else {
                    params.delete( 'tec_venue_city' );
                }

                if ( state ) {
                    params.set( 'tec_venue_state', state );
                } else {
                    params.delete( 'tec_venue_state' );
                }

                var newUrl = window.location.pathname + ( params.toString() ? '?' + params.toString() : '' ) + window.location.hash;
                var curUrl = window.location.pathname + ( window.location.search ? window.location.search : '' ) + window.location.hash;

                // No-op if URL wouldn't change
                if ( newUrl === curUrl ) {
                    return;
                }

                // Prevent multiple navigations in quick succession
                if ( isNavigating ) {
                    return;
                }

                if ( navTimeout ) {
                    clearTimeout( navTimeout );
                }
                navTimeout = setTimeout( function () {
                    navTimeout = null;
                    isNavigating = true;
                    // Force a full navigation — no AJAX/SPA behavior for now
                    window.location.href = newUrl;
                    // Reset guard after a short period in case navigation is prevented
                    setTimeout( function () { isNavigating = false; }, 2000 );
                }, 150 );
            } );

            $clear.on( 'click', function ( e ) {
                e.preventDefault();
                var params = new URLSearchParams( window.location.search );
                params.delete( 'tribe_events_cat' );
                params.delete( 'tag' );
                params.delete( 'tec_venue' );
                params.delete( 'tec_organizer' );
                params.delete( 'tec_venue_city' );
                params.delete( 'tec_venue_state' );
                var newUrl = window.location.pathname + ( params.toString() ? '?' + params.toString() : '' ) + window.location.hash;
                var curUrl = window.location.pathname + ( window.location.search ? window.location.search : '' ) + window.location.hash;

                if ( newUrl === curUrl ) {
                    return;
                }

                if ( isNavigating ) {
                    return;
                }

                if ( navTimeout ) {
                    clearTimeout( navTimeout );
                }
                navTimeout = setTimeout( function () {
                    navTimeout = null;
                    isNavigating = true;
                    // Force a full navigation on clear as well
                    window.location.href = newUrl;
                    setTimeout( function () { isNavigating = false; }, 2000 );
                }, 150 );
            } );
        }

        // Initial render
        renderFilters();

        // Watch for changes to the top bar (views switching) and re-render filters
        var target = document.body;
        var renderTimeout = null;
        var observer = new MutationObserver( function ( mutations ) {
            var shouldRender = false;
            mutations.forEach( function ( m ) {
                if ( m.addedNodes && m.addedNodes.length ) {
                    // Only trigger a re-render when nodes related to TEC views/top bar are added.
                    // This prevents reacting to our own DOM changes and avoids an infinite re-render loop.
                    Array.prototype.forEach.call( m.addedNodes, function ( node ) {
                        if ( ! ( node instanceof Element ) ) {
                            return;
                        }
                        if ( node.matches( '.tribe-events-c-top-bar, .tribe-events-c-view-selector' ) || node.querySelector( '.tribe-events-c-top-bar, .tribe-events-c-view-selector' ) ) {
                            shouldRender = true;
                        }
                    } );
                }
            } );

            if ( shouldRender ) {
                // debounce multiple quick mutations into one render
                if ( renderTimeout ) {
                    clearTimeout( renderTimeout );
                }
                renderTimeout = setTimeout( function () {
                    renderTimeout = null;
                    renderFilters();
                }, 100 );
            }
        } );
        observer.observe( target, { childList: true, subtree: true } );

        // Also listen to clicks on the view selector to re-render briefly after a change
        $( document ).on( 'click', '.tribe-events-c-view-selector a, [data-js="tribe-events-view-selector"] a', function () {
            // small delay to let TEC re-render
            setTimeout( renderFilters, 150 );
        } );
    }

    $( document ).ready( init );
} )( jQuery );
