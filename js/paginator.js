

class Paginator
{
    constructor(model, config)
    {
        this._model = model
        this._config = config
    }

    load(pageNumber, filters) {

        if( isUndefined(filters) ) filters = {}
        const params = this._queryParams(pageNumber, filters)
        const url = this._model.config.url
        const self = this

        const navs = $(self._config.nav)

        const request = $.get(url, params, function(data) {

            self._model.removeAll()
            navs.empty()

            $.each(data, function(i, item) {
                var task = new Task(item);
                task.render();
            });

            const numPages = self._config.getNumPages(request, data)
            navs.each(function(i, element) {
                const el = $(element)
                for(let i = 1; i <= numPages; i++) {
                    if( i == pageNumber ) {
                        el.append('<span>' + i + ' </span>')
                    } else {
                        const link = $('<span><a href="#">'+i+'</a> </span>')
                        link.on('click', function(e) {
                            e.preventDefault()
                            self.load(i)
                        })
                        el.append(link)
                    }
                }
            })
        })
    }

    _queryParams(pageNumber, filters) {

        let params = deepCopyObject(filters)
        params[this._config.pageKey] = pageNumber
        params[this._config.pageSizeKey] = this._config.pageSize

        return params
    }

}
