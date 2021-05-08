const Delta = require('quill-delta')

const DOCUMENTS = new Map()
const DEFAULT_VALUE = { ops: [] }

const io = require('socket.io')(3001, {
  cors: {
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST'],
  },
})

io.on('connection', socket => {
  console.log('Client connected to socket')

  socket.on('get-document', async documentId => {
    console.log(`Client requested document ${documentId}`)

    const document = findOrCreateDocument(documentId)
    console.log('Serving document', document)

    socket.join(documentId)
    socket.emit('load-document', document.data)

    socket.on('send-changes', delta => {
      findAndCreateOrUpdate(documentId, delta)
      console.log(`Broadcasting changes to document ${documentId}:`, delta)
      socket.broadcast.to(documentId).emit('receive-changes', delta)
    })
  })
})

function findAndCreateOrUpdate(id, delta) {
  if (!id) return

  const currentDoc = findOrCreateDocument(id)
  const doc = new Delta(currentDoc.data)
  const newDoc = { _id: id, data: doc.compose(delta) }
  DOCUMENTS.set(id, newDoc)
  return newDoc
}

function findOrCreateDocument(id) {
  if (!id) return

  if (DOCUMENTS.has(id)) return DOCUMENTS.get(id)

  DOCUMENTS.set(id, { _id: id, data: DEFAULT_VALUE })
  return DOCUMENTS.get(id)
}
