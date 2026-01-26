<?php
/**
 * Plugin Name: TEC Simple Filters
 * Description: Adds simple filters (venue, venue city, organizer) to The Events Calendar events bar.
 * Version: 0.1.0
 * Author: GitHub Copilot
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

register_activation_hook( __FILE__, 'tec_simple_filters_activate' );
function tec_simple_filters_activate() {
    if ( ! class_exists( 'Tribe__Events__Main' ) && ! function_exists( 'tribe_get_venues' ) ) {
        deactivate_plugins( plugin_basename( __FILE__ ) );
        wp_die( esc_html__( 'TEC Simple Filters requires The Events Calendar plugin to be active. Plugin has been deactivated.', 'tec-simple-filters' ) );
    }
}

add_action( 'admin_notices', 'tec_simple_filters_admin_notice_if_missing' );
function tec_simple_filters_admin_notice_if_missing() {
    if ( current_user_can( 'activate_plugins' ) && ! class_exists( 'Tribe__Events__Main' ) && ! function_exists( 'tribe_get_venues' ) ) {
        echo '<div class="notice notice-error is-dismissible">';
        echo '<p><strong>' . esc_html__( 'TEC Simple Filters requires The Events Calendar plugin to be active.', 'tec-simple-filters' ) . '</strong></p>';
        echo '</div>';
    }
}

add_action( 'init', 'tec_simple_filters_setup' );
function tec_simple_filters_setup() {
    if ( ! class_exists( 'Tribe__Events__Main' ) && ! function_exists( 'tribe_get_venues' ) ) {
        return;
    }

    add_action( 'wp_enqueue_scripts', 'tec_simple_filters_enqueue_assets' );
    add_filter( 'tribe_events_views_v2_view_repository_args', 'tec_simple_filters_apply_filters', 10, 3 );
    add_filter( 'tribe_events_views_v2_view_url', 'tec_simple_filters_preserve_query_args_in_view_urls', 10, 3 );
}

/**
 * Helper to get query value from context or global state.
 */
function tec_simple_filters_get_val( $key, $context = null ) {
    // 1. Try passed context (e.g. from a filter)
    if ( $context && method_exists( $context, 'get' ) ) {
        $val = $context->get( $key );
        if ( $val !== null ) return $val;
    }
    
    // 2. Try View object context
    if ( is_object( $context ) && method_exists( $context, 'get_context' ) ) {
        $view_context = $context->get_context();
        if ( $view_context && method_exists( $view_context, 'get' ) ) {
            $val = $view_context->get( $key );
            if ( $val !== null ) return $val;
        }
    }

    // 3. Fallback to global tribe_context
    if ( function_exists( 'tribe_context' ) ) {
        $val = tribe_context()->get( $key );
        if ( $val !== null ) return $val;
    }

    // 4. Final fallback to $_GET
    return isset( $_GET[ $key ] ) ? $_GET[ $key ] : '';
}

function tec_simple_filters_enqueue_assets() {
    $dir = plugin_dir_url( __FILE__ );
    wp_enqueue_style( 'tec-simple-filters', $dir . 'assets/css/filters.css', [], '0.1.0' );
    wp_enqueue_script( 'tec-simple-filters', $dir . 'assets/js/filters.js', [ 'jquery' ], '0.1.0', true );

    $venues = [];
    if ( function_exists( 'tribe_get_venues' ) ) {
        $raw = tribe_get_venues( false, -1, true );
        foreach ( $raw as $v ) {
            $venues[] = [ 'id' => $v->ID, 'name' => get_the_title( $v->ID ), 'city' => get_post_meta( $v->ID, '_VenueCity', true ) ];
        }
    }

    // Collect states/provinces from venue meta
    $states = [];
    if ( ! empty( $venues ) ) {
        foreach ( $venues as $v ) {
            $state = get_post_meta( $v['id'], '_VenueState', true );
            if ( empty( $state ) ) {
                $state = get_post_meta( $v['id'], '_VenueProvince', true );
            }
            if ( empty( $state ) ) {
                // some sites store combined state/province
                $state = get_post_meta( $v['id'], '_VenueStateProvince', true );
            }
            if ( $state ) {
                $states[] = $state;
            }
        }
        $states = array_values( array_filter( array_unique( $states ) ) );
    }

    $organizers = [];
    if ( function_exists( 'tribe_get_organizers' ) ) {
        $raw = tribe_get_organizers( false, -1, true );
        foreach ( $raw as $o ) {
            $organizers[] = [ 'id' => $o->ID, 'name' => get_the_title( $o->ID ) ];
        }
    }

    // Categories and tags
    $categories = [];
    $tags = [];
    $cat_terms = get_terms( [ 'taxonomy' => 'tribe_events_cat', 'hide_empty' => false ] );
    if ( ! is_wp_error( $cat_terms ) && ! empty( $cat_terms ) ) {
        foreach ( $cat_terms as $c ) {
            $categories[] = [ 'id' => $c->slug, 'name' => $c->name ];
        }
    }
    $tag_terms = get_terms( [ 'taxonomy' => 'post_tag', 'hide_empty' => false ] );
    if ( ! is_wp_error( $tag_terms ) && ! empty( $tag_terms ) ) {
        foreach ( $tag_terms as $t ) {
            $tags[] = [ 'id' => $t->slug, 'name' => $t->name ];
        }
    }

    $cities = array_values( array_filter( array_unique( array_map( function ( $v ) {
        return isset( $v['city'] ) ? trim( $v['city'] ) : '';
    }, $venues ) ) ) );

    $states = isset( $states ) && is_array( $states ) ? array_values( array_filter( array_unique( $states ) ) ) : [];

    wp_localize_script( 'tec-simple-filters', 'TecSimpleFiltersData', [
        'venues'     => $venues,
        'organizers' => $organizers,
        'cities'     => $cities,
        'states'     => $states,
        'categories' => $categories,
        'tags'       => $tags,
    ] );
}

function tec_simple_filters_apply_filters( $args, $context, $view ) {
    if ( empty( $args['meta_query'] ) || ! is_array( $args['meta_query'] ) ) {
        $args['meta_query'] = [ 'relation' => 'AND' ];
    } elseif ( ! isset( $args['meta_query']['relation'] ) ) {
        $args['meta_query']['relation'] = 'AND';
    }

    if ( empty( $args['tax_query'] ) || ! is_array( $args['tax_query'] ) ) {
        $args['tax_query'] = [ 'relation' => 'AND' ];
    } elseif ( ! isset( $args['tax_query']['relation'] ) ) {
        $args['tax_query']['relation'] = 'AND';
    }

    $venue_id = intval( tec_simple_filters_get_val( 'tec_venue', $context ) );
    if ( $venue_id ) {
        $args['meta_query'][] = [
            'key'     => '_EventVenueID',
            'value'   => $venue_id,
            'compare' => '=',
        ];
    }

    $organizer_id = intval( tec_simple_filters_get_val( 'tec_organizer', $context ) );
    if ( $organizer_id ) {
        $args['meta_query'][] = [
            'key'     => '_EventOrganizerID',
            'value'   => $organizer_id,
            'compare' => '=',
        ];
    }

    // Category (tribe_events_cat) filter - taxonomy by slug
    $cat = sanitize_text_field( tec_simple_filters_get_val( 'tribe_events_cat', $context ) );
    if ( $cat ) {
        $args['tax_query'][] = [
            'taxonomy' => 'tribe_events_cat',
            'field'    => 'slug',
            'terms'    => $cat,
        ];
    }

    // Tag filter (post_tag) - use query var
    $tag = sanitize_text_field( tec_simple_filters_get_val( 'tag', $context ) );
    if ( $tag ) {
        $args['tag'] = $tag;
    }

    $city = sanitize_text_field( tec_simple_filters_get_val( 'tec_venue_city', $context ) );
    if ( $city ) {
        $city_group = [ 'relation' => 'OR' ];

        // 1) Check event meta directly (fallback)
        $city_group[] = [ 'key' => '_VenueCity', 'value' => $city, 'compare' => '=' ];

        // 2) Find venues with matching city
        $venue_ids = get_posts( [
            'post_type'   => 'tribe_venue',
            'numberposts' => -1,
            'fields'      => 'ids',
            'meta_query'  => [
                [ 'key' => '_VenueCity', 'value' => $city, 'compare' => '=' ],
            ],
        ] );

        if ( ! empty( $venue_ids ) ) {
            $city_group[] = [
                'key'     => '_EventVenueID',
                'value'   => $venue_ids,
                'compare' => 'IN',
            ];
        }

        $args['meta_query'][] = $city_group;
    }

    $state = sanitize_text_field( tec_simple_filters_get_val( 'tec_venue_state', $context ) );
    if ( $state ) {
        $state_group = [ 'relation' => 'OR' ];

        // Direct event meta checks (fallback)
        $state_group[] = [ 'key' => '_VenueState', 'value' => $state, 'compare' => '=' ];
        $state_group[] = [ 'key' => '_VenueProvince', 'value' => $state, 'compare' => '=' ];

        // Find venues with matching state/province
        $venue_ids = get_posts( [
            'post_type'   => 'tribe_venue',
            'numberposts' => -1,
            'fields'      => 'ids',
            'meta_query'  => [
                'relation' => 'OR',
                [ 'key' => '_VenueState', 'value' => $state, 'compare' => '=' ],
                [ 'key' => '_VenueProvince', 'value' => $state, 'compare' => '=' ],
                [ 'key' => '_VenueStateProvince', 'value' => $state, 'compare' => '=' ],
            ],
        ] );

        if ( ! empty( $venue_ids ) ) {
            $state_group[] = [
                'key'     => '_EventVenueID',
                'value'   => $venue_ids,
                'compare' => 'IN',
            ];
        }

        $args['meta_query'][] = $state_group;
    }

    return $args;
}

function tec_simple_filters_preserve_query_args_in_view_urls( $url, $canonical, $view ) {
    $params = [];
    $keys = [ 'tec_venue', 'tec_organizer', 'tec_venue_city', 'tec_venue_state', 'tribe_events_cat', 'tag' ];
    
    foreach ( $keys as $key ) {
        // Pass the view object itself to the helper so it can extract the view's specific context
        $val = tec_simple_filters_get_val( $key, $view );
        if ( $val ) {
            $params[ $key ] = $val;
        }
    }

    if ( $params ) {
        $url = add_query_arg( $params, $url );
    }

    return $url;
}
