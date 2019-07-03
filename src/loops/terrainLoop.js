import {tileBuilder} from './tileBuilder'
import {voxelBuilder} from './voxelsLoop'
import PubSub from '../events'
import keyboardJS from 'keyboardjs'

const terrainLoops = [
    voxelBuilder,
    tileBuilder
]

let activeTerrainIndex = 0

const terrainLoop = (timestamp) => terrainLoops[activeTerrainIndex](timestamp)

keyboardJS.bind('t', e => {
    console.log('switch terrain')
    terrainLoops[activeTerrainIndex].clean()
    activeTerrainIndex = activeTerrainIndex === terrainLoops.length - 1 ? 0 : activeTerrainIndex + 1
    console.log('switch terrain done')
})

export {terrainLoop}
