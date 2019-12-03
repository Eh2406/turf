import fs from 'fs';
import test from 'tape';
import path from 'path';
import load from 'load-json-file';
import write from 'write-json-file';
import envelope from '../envelope';
import pointGrid from '../point-grid';
import truncate from '../truncate';
import { getCoords } from '../invariant';
import { lineString } from '../helpers';
import { featureEach } from '../meta';
import { randomPolygon }  from '../random';
import matrixToGrid from './lib/matrix-to-grid';
import isobands from './';

const directories = {
    in: path.join(__dirname, 'test', 'in') + path.sep,
    out: path.join(__dirname, 'test', 'out') + path.sep
};

const fixtures = fs.readdirSync(directories.in).map(filename => {
    return {
        filename,
        name: path.parse(filename).name,
        json: load.sync(directories.in + filename)
    };
});

test('isobands', t => {
    fixtures.forEach(({name, json, filename}) => {
        const options = json.properties || json
        const { breaks, matrix, origin, cellSize } = options;

        // allow GeoJSON featureCollection or matrix
        let points = json.properties ? json : matrixToGrid(matrix, origin, cellSize, options);

        // Results
        const results = truncate(isobands(points, breaks, options));

        // Add red line around point data
        results.features.push(lineString(getCoords(envelope(points))[0], {
            stroke: '#F00',
            'stroke-width': 1
        }));

        if (process.env.REGEN) write.sync(directories.out + name + '.geojson', results);
        t.deepEqual(results, load.sync(directories.out + name + '.geojson'), name);
    });

    t.end();
});

test('isobands -- flat data', t => {
    const points = pointGrid([-70.823364, -33.553984, -70.473175, -33.302986], 5, {
        properties: {elevation: 1}
    });

    const lines = isobands(points, [0, 2]);
    t.assert(lines.features[0].geometry.coordinates[0][0].length > 4);
    t.end();
});

test('isobands -- throws', t => {
    const points = pointGrid([-70.823364, -33.553984, -70.473175, -33.302986], 5);

    t.throws(() => isobands(randomPolygon(), [1, 2, 3]), 'invalid points');
    t.throws(() => isobands(points, ''), 'invalid breaks');
    t.throws(() => isobands(points, [1, 2, 3], {zProperty: 'temp', breaksProperties: 'hello' }), 'invalid options');

    t.end();
});