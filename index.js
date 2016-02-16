'use strict'

let Rx = require('rx')
let urlJoin = require('url-join')
let routeParams = require('route-params')

let Observable = Rx.Observable
let ReplaySubject = Rx. ReplaySubject

const BACK = 'BACK'
const FORWARD = 'FORWARD'
const REDIRECT = 'REDIRECT'

let isObservable = val => (typeof val === 'object' && typeof val.subscribe === 'function')

exports.makeRouterDriver = function makeRouterDriver (history) {

  return sink$ => {

    let source$ = new ReplaySubject(1)
    history.listen(location => source$.onNext(location))

    let customActions$ = sink$.filter(isObservable).mergeAll()
    let pushActions$ = sink$.filter(value => !isObservable(value))

    pushActions$.forEach(pathname => history.push(pathname))
    customActions$
      .forEach(action => {

        switch (action.type) {
          case BACK: {
            return history.goBack()
          }

          case FORWARD: {
            return history.goForward()
          }

          case REDIRECT: {
            return history.replace(action.payload)
          }

          default: {
            throw new TypeError('Invalid type for router action')
          }
        }
      })

    return {
      location$: source$,
      route: nextRoutePath => makeRoute(source$, '/', nextRoutePath),
      redirect: pathanme => Observable.just({type: REDIRECT, payload: pathanme}),
      goBack: () => Observable.just({type: BACK}),
      goForward: () => Observable.just({type: FORWARD})
    }
  }
}

function makeRoute (source$, baseRoutePath, routePath) {

  let fullRoutePath = urlJoin(baseRoutePath, routePath)
  let location$ = source$.filter(location => routeParams(fullRoutePath, location.pathname))
  let params$ = location$.map(location => routeParams(fullRoutePath, location.pathname))

  function route (nextRoutePath) {

    return makeRoute(
      source$.filter(location => routeParams(`${baseRoutePath}*:next`, location.pathname)),
      urlJoin(baseRoutePath, routePath),
      nextRoutePath
    )
  }

  return {
    location$,
    params$,
    route
  }
}
