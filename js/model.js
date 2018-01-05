

function object2dom(obj)
{
	// TODO: check if object

	var tag = obj['tag']
	var element = document.createElement(tag)
	for (var key in obj) {
		if(key == 'tag') continue;

		if(key == 'children') {
			var children = obj[key]
			for(var i = 0; i < children.length; i++) {
  				var child = children[i]
  				if(isObject(child)) {
  					element.appendChild(object2dom(child))	
  				} else {
  					// TODO: error handling
  					element.appendChild(document.createTextNode(child))
  				}
  				
  			}
  		} else if(key == 'style') {
  			for(styleKey in obj[key]) {
  				element.style[styleKey] = obj[key][styleKey]
  			}
  		} else if (obj.hasOwnProperty(key)) {
	  		var value = obj[key]
	  		element.setAttribute(key, value)
	  	}
	}

	return element
}


function prepareURL(rawURL)
{
	return rawURL + '/'  // For django with APPEND_URL
}


function preparePostData(object) { // for django
	return visitObject(object, function(value) {
		// Replace sub-objects by their IDs
		return isObject(value) ? value.id : value
	})
}


DEFAULT_DOM =compileTemplates({
	id: "{{ config.name }}-{{ data.id }}",
	'data-id': "{{ data.id }}",
	'class': "{{ config.name }}"
})

function compileTemplates(obj)
{
	return visitObject(obj, function(value) {
		if(typeof value == 'string' && value.indexOf("{{") > -1) {
			return Handlebars.compile(value)
		}

		return value

	}, true, true)
}

function fillTemplates(obj, context)
{
	return visitObject(obj, function(value) {
		if(typeof value == 'function') {
			return value(context)
		} 

		return value

	}, false, true)
}


UNSAVED_ID = -1


function Model(config)
{
	config.dom = mergeObjects([DEFAULT_DOM, config.dom])
	compileTemplates(config.dom)
	

	// Returned class
	function _model(data) {

		this.data = data || {}

		// Make a copy of dom so it can be altered per-instance
		this.dom = deepCopyObject(config.dom)
		
		// New objects
		if(isUndefined(this.data.id)) {
			this.data.id = --UNSAVED_ID
		}

		_model.instances[this.data.id] = this

	}

	_model.config = config

	_model.instances = {}

	_model.instance = function(id) { return _model.instances[id] }

	_model.allWithin = function(rectangle) {
		var ret = []
		forEach(_model.instances, function(key, instance) {
			if(instance.element.isWithin(rectangle)) {
				// console.log(instance.data.id, " is within ", rectangle)
				ret.push(instance)
			}
		})
		return ret
	}

	_model.prototype.config = config

	// Instance methods

	_model.prototype.isNew = function() {
		return this.data.id <= 0
	}

	// _model.prototype.element = function() {
	// 	var dom = fillTemplates(this.dom, this)  // TODO: expensive
	// 	return $('#'+ dom.id)
	// }

	_model.prototype.save = function() {
		
		var instance = this
		var deferred

		this.runHook('preSave')
		if( this.isNew() ) {
			this.runHook('preCreate')
			var postData = preparePostData(this.data)
			var instance = this
			deferred = $.post(prepareURL(this.config.url), postData, function(data) {
				console.log("created")
				delete _model.instances[instance.data.id]
				_model.instances[data.id] = instance
				instance.data.id = data.id // TODO: Should load all data from server, but POST return is not hierarchical. Django REST issue? 

				instance.render()
				instance.runHook('postSave')
				instance.runHook('postCreate')
			})
		} else {
			deferred = $.ajax(prepareURL(instance.url()), {
				method: 'PATCH',
				data: preparePostData(instance.data),
				success: function() {
					instance.render()
					instance.runHook('postSave')
				}
			})
		}

		return deferred
	}

	_model.prototype.id = function() { return this.data.id }

	_model.prototype.remove = function(dbOnly) {
		
		var deferred

		this.runHook('preRemove')
		
		if( ! this.isNew() ) {
			deferred = $.ajax(prepareURL(this.url()), {method: 'DELETE'})
		}
		
		if(! dbOnly ) this.element.remove()

		delete _model.instances[this.data.id]
		this.runHook('postRemove')

		return deferred
	}

	_model.prototype.load = function(callback) {
		if( this.isNew() ) throw "Cannot load new object (save first)"
		$.get(prepareURL(this.url()), callback)
	}

	_model.prototype.render = function() {

		// if already rendered, update
		// else append

		this.runHook('preRender')

		var dom = this.dom
		var parent = $(Handlebars.compile(this.config.parent)(this))  // TODO: compile only once
		
		// TODO: recursively instantiate template
		var filled = fillTemplates(dom, this)
		
		element = object2dom(filled)
		

		if(this.element && this.element.length) {
			this.element.replaceWith(element)
		} else {
			parent.append(element)	
		}

		this.element = $('#' + filled.id)

		this.element.data('model', this)

		this.runHook('postRender')
	}

	_model.prototype.url = function() {
		if(this.data.id < 0) {
			throw "unsaved object has no URL"
		}

		return this.config.url + "/" + this.data.id 
	}

	_model.prototype.runHook = function(hookName) {
		var hook = this.config.hooks && this.config.hooks[hookName]
		if(isFunction(hook)) {
			hook.call(this)
		}
	}

	return _model
}


$.fn.model = function() { return this.data('model') || false }

