/**
 * @copyright Pavel Koryagin, ExtPoint
 * @author Pavel Koryagin, pavel@koryagin.com
 * @author Vladimir Kozhin, affka@affka.ru
 * @license MIT
 */

;
(function($, Backbone) {
	'use strict';

	/**
	 * @class Backbone.StickyView
	 * @extends Backbone.View
	 */
	Backbone.StickyView = Backbone.View.extend({

		/**
		 * Initialize with string or _.template.
		 * Strings will be turned into _.template during construction.
		 * @type {String|Function}
		 */
		template: null,

		/**
		 * Binding rules for Joints.ModelBinding
		 * @type {Object}
		 */
		modelBinding: null,

		/**
		 * @type {Object}
		 */
		options: null,

		/**
		 * Method run after template rendered
		 */
		onRender: $.noop,

		/**
		 * Override this to set elements' sizes
		 */
		doLayout: $.noop,

		/**
		 * Override this to create children
		 */
		createChildren: $.noop,

		constructor: function(options)
		{
			this.options = options || {};

			this.cid = _.uniqueId('view');
			options || (options = {});
			var viewOptions = ['model', 'collection', 'el', 'id', 'attributes', 'className', 'tagName', 'events', 'template'];
			_.extend(this, _.pick(options, viewOptions));
			this.initialize.apply(this, arguments);
			this._render();
			this.delegateEvents();

			if (this.className) {
				this.$el.addClass(this.className);
			}

			// Create children after render and initialization
			this.createChildren();

			// Apply size on initialization
			this.doLayout();
		},

		getTemplateData: function()
		{
			return this.model ? this.model.attributes : {};
		},

		_render: function()
		{
			// Initialize by template, if used
			if (this.template != null)
			{
				if (this.el) {
					throw new Error("Cannot attach templated views like "+this.__className+".");
				}

				// Create structure
				var template = _.isFunction(this.template)
					? this.template.call(this, this.getTemplateData())
					: this.template;

				if (
					// Check has root tag
					/^\s*</.test(template) &&

					// Init DOM and check for single tag
					(this.$el = $(template)).length == 1
				){
					// Keep $el, set el
					this.el = this.$el[0];
				}
				else
					throw new Error("StickViews's template must have the single root element. This is wrong: " + template);
			}
			// Attach to el or create new as Backbone does
			else
			{
				// Use default backbone's _ensureElement()
				this._ensureElement();
			}

			// Attach
			this.$el.data(Backbone.StickyView.DATA_ID, this);
			this.$el.addClass(Backbone.StickyView.MARKER_CLASS);

			// Insert to parent
			if (this.options.appendTo)
				this.$el.appendTo(this.options.appendTo);
			else if (this.options.prependTo)
				this.$el.prependTo(this.options.prependTo);
			else if (this.options.replaceEl)
				this.$el.replaceAll(this.options.replaceEl);

			// Connect model
			if (this.model) {

				// Destroy
				this.model.on('destroy', this.remove, this);

				// ModelBinding rules
				if (this.modelBinding)
					this.bindModel(this.modelBinding).fireAll();
			}

			// Additional logic for render
			this.onRender();
		},

		/**
		 * Returns Backbone.StickyView for the own element if no selector or child element by provided selector
		 * @param {string} [selector]
		 * @returns {Backbone.StickyView}
		 */
		viewSet: function(selector)
		{
			return (selector ? this.$el.find(selector) : this.$el).viewSet();
		},

		/**
		 * Create Joints.ModelBinding by rules
		 * @param {Object} rules
		 * @returns {Joints.ModelBinding}
		 */
		bindModel: function(rules) {
			return new Joints.ModelBinding({
				model: this.model,
				view: this,
				scope: this,
				rules: rules
			});
		},

		/**
		 * Get the closest containing StickyView
		 * @returns {Backbone.StickyView}
		 */
		parentView: function()
		{
			return this.$el.parent().view();
		}

		// TODO: consider to add anything like externalEvents: {}

	}, {
		DATA_ID: 'stickyView',
		MARKER_CLASS: 'stickyView',
		MARKER_SELECTOR: '.stickyView',

		/**
		 *
		 * @param {Object} options
		 */
		bindCollection: function(options) {
			return new Joints.CollectionBinding(_.defaults({
				viewClass: this
			}, options));

		}
	});

	/**
	 * @name view
	 * @memberOf jQuery#
	 */
	$.fn.view = function()
	{
		var value = this.data(Backbone.StickyView.DATA_ID);
		return value || this.closest(Backbone.StickyView.MARKER_SELECTOR)
			.data(Backbone.StickyView.DATA_ID) || null;
	};

	/**
	 * @name views
	 * @memberOf jQuery#
	 */
	$.fn.views = function()
	{
		var i, view, result = [];
		for (i = 0; i < this.length; i++)
		{
			view = $(this[i]).view();
			if (_.indexOf(result, view) == -1)
				result.push(view);
		}
		return result;
	};

	/*
		Initialization
	*/
	$(function() {
		$(window).resize(function() {

			// Get all views
			var views = $(Backbone.StickyView.MARKER_SELECTOR).views();

			while (views.length)
			{
				var view = views[0],
					parentView;

				// Find unhandled root
				while (parentView = view.parentView() && _.indexOf(views, parentView) != -1) {
					view = parentView;
				}

				// Notify
				view.doLayout();

				// Drop
				views.splice(_.indexOf(views, view), 1);
			}
		});
	});

})(jQuery, Backbone);
