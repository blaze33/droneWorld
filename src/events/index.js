import PubSub from 'pubsub-js'

console.log(PubSub)

PubSub.subscribe('x', (msg, data) => console.log(msg, data))

export default PubSub
