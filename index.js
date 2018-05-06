/*
 * Copyright 2018 Teppo Kurki <teppo.kurki@iki.fi>
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

const tj = require('@mapbox/togeojson')
const fs = require('fs')
const path = require('path')
const xmldom = new (require('xmldom').DOMParser)()
const get = require('lodash.get')
const uuidv3 = require('uuid/v3')

module.exports = function (app) {
  const error =
    app.error ||
    (msg => {
      console.error(msg)
    })
  const debug =
    app.debug ||
    (msg => {
      console.log(msg)
    })

  const plugin = {}

  plugin.start = function (props) {}

  plugin.stop = function () {}

  plugin.statusMessage = function () {}

  plugin.id = 'simple-gpx'
  plugin.name = 'Simple GPX'
  plugin.description =
    'Plugin to incorporate gis data from different formats gpx files into the SK API'

  plugin.schema = {
    type: 'object',
    properties: {}
  }

  plugin.signalKApiRoutes = router => {
    router.get('/resources/routes', (req, res) => {
      res.json(readGpxDirectory(path.join(__dirname, 'samples/routes'), app.selfId))
    })

    router.get('/resources/tracks', (req, res) => {
      const features = readGpxDirectory(path.join(__dirname, 'samples/tracks'), app.selfId)
      for (var id in features) {
        const feature = features[id]
        const coordTimes = get(feature, 'properties.coordTimes')
        const coordinates = get(feature, 'geometry.coordinates')
        if (get(feature, 'geometry.type') === 'MultiLineString' && coordTimes && coordinates) {
          if (coordTimes.length === coordinates.length) {
            coordTimes.forEach((timesArray, i) => {
              timesArray.forEach((time, j) => {
                coordinates[i][j].push(0)
                coordinates[i][j].push(time)
              })
            })
            delete feature.properties.coordTimes
          }
        }
      }
      res.json(features)
    })

    router.get('/resources/waypoints', (req, res) => {
      res.json(readGpxDirectory(path.join(__dirname, 'samples/waypoints'), app.selfId))
    })

    return router
  }

  return plugin

  function readGpxDirectory (dir, uuidNamespace) {
    return fs.readdirSync(dir).reduce((acc, filename) => {
      try {
        const geojson = tj.gpx(
          xmldom.parseFromString(
            fs.readFileSync(path.join(dir, filename), 'utf8')
          )
        )
        if (geojson.type === 'FeatureCollection' && Array.isArray(geojson.features)) {
          geojson.features.forEach((feature, i) => {
            acc[uuidv3(filename + i, uuidNamespace)] = feature
          })
        }
      } catch (e) {
        console.error(e)
      }
      return acc
    }, {})
  }
}
