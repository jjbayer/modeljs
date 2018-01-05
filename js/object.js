

function forEach(object, function_)
{
	for(key in object) {
		if(object.hasOwnProperty(key)) {
			function_(key, object[key])
		}
	}
}


function isArray(obj)
{
	return Object.prototype.toString.call(obj) == '[object Array]';
}

function isObject(obj)
{
	return (obj != null) && (typeof obj == 'object') && ! isArray(obj);
}

function isFunction(func) {
	return typeof func == 'function'
}


function isUndefined(something)
{
	return typeof something == 'undefined'
}



function visitArray(arr, transformator, recurse)
{
	// assert arr is array

	if(isUndefined(recurse)) recurse = false

	var ret = []
	for(var i = 0; i < arr.length; i++) {
		var value = arr[i]
		if(recurse && isArray(value)) {
			ret.push(visitArray(value, transformator, true))
		} else if(recurse && isObject(value)) {
			ret.push(visitObject(value, transformator, false, true))
		} else {
			ret.push(transformator(value))
		}
	}

	return ret
}


function visitObject(object, transformator, overwrite, recurse)
{
	if(isUndefined(overwrite)) overwrite = false
	if(isUndefined(recurse)) recurse = false

	var ret = overwrite ? object : {}
	forEach(object, function(key, value) {
		if(recurse && isObject(value)) {
			ret[key] = visitObject(value, transformator, false, true)
		} else if(recurse && isArray(value)) {
			ret[key] = visitArray(value, transformator, true)
		} else {
			ret[key] = transformator(value)
		}
	})

	return ret
}


function deepCopyObject(object)
{
	return visitObject(
		object,
		function(value) { return value },
		false,
		true)
}


function mergeObjects(listOfObjects)
{
	var ret = {}

	for(var i = 0; i < listOfObjects.length; i++) {
		var object = listOfObjects[i]
		for(key in object) if (object.hasOwnProperty(key)) {
			ret[key] = object[key]
		}
	}

	return ret
}
