# Simple Filter for The Events Calendar

Adds clean, AJAX-powered filters for Venue, Venue City, Organizer, Category, and Tag to The Events Calendar's V2 Events Bar.

## Description

**TEC Simple Filters** extends **The Events Calendar** by adding a secondary row of filters directly below the search bar. This allows your users to drill down into events by specific criteria.

### Key Features
*   **Seamless Integration**: Designed to look and feel like a native part of The Events Calendar V2 views.
*   **AJAX Powered**: Filters update the event list instantly without a full page reload.
*   **Responsive**: Cleanly stacks on mobile devices.
*   **Developer Friendly**: Includes a WordPress filter to easily enable or disable specific filter dropdowns.
*   **GitUpdater Compatible**: Supports automatic updates via the [GitUpdater](https://git-updater.com/) plugin.

## Installation

1.  Upload the `tec-simple-filter` folder to the `/wp-content/plugins/` directory.
2.  Activate the plugin through the 'Plugins' menu in WordPress.
3.  Ensure **The Events Calendar** (v5.0+) is installed and active.

## Developer Hooks

### `tec_simple_filters_active_filters`

You can use this filter to selectively remove any of the default filters or change their labels/placeholders.

**Available filter keys:**
*   `category`
*   `tag`
*   `venue`
*   `organizer`
*   `city`
*   `state`

#### Example: Removing specific filters
Add this to your theme's `functions.php`:

```php
add_filter( 'tec_simple_filters_active_filters', function( $filters ) {
	// Remove the Tag and Organizer filters
	unset( $filters['tag'] );
	unset( $filters['organizer'] );
	
	return $filters;
} );
```

#### Example: Changing a label
```php
add_filter( 'tec_simple_filters_active_filters', function( $filters ) {
	if ( isset( $filters['city'] ) ) {
		$filters['city']['label'] = 'Location (City)';
		$filters['city']['placeholder'] = 'Search by city...';
	}
	return $filters;
} );
```

## Requirements
*   PHP 7.4+
*   The Events Calendar 6.0+ (V2 Views enabled)

## License
GPLv2 or later
