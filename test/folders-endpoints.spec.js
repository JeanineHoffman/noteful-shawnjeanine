const { expect } = require('chai');
const moment = require('moment');
const knex = require('knex');
const app = require('../src/app');
const { makeFoldersArray } = require('./folders.fixtures');
​
​
​
​
describe.skip('Folders Endpoints', () => {
  let db;
​
  before('Make knex instance', () => {
    db = knex({
      client: 'pg',
      connection: process.env.TEST_DB_URL,
    })
    app.set('db', db);
  })
​
  after('Disconnect from db', () => db.destroy());
​
  before('Clean the table', () => db('folders').truncate());
​
  afterEach('Clean up', () => db('folders').truncate());
​
  describe(`GET /api/folders`, () => {
    context(`Given no folders`, () => {
      it(`responds with 200 and an empty list`, () => {
        return supertest(app)
          .get('/api/folders')
          .expect(200, [])
      })
    })
​
    context('Given there are folders in the database', () => {
      const testFolders = makeFoldersArray()
​
      beforeEach('insert folders', () => {
        return db
          .into('folders')
          .insert(testFolders)
      })
​
      it('responds with 200 and all of the folders', () => {
        return supertest(app)
          .get('/api/folders')
          .expect(200, testFolders)
      })
    })
​
    context(`Given an XSS attack folder`, () => {
      const maliciousFolder = {
        id: 911,
        title: 'Naughty naughty very naughty <script>alert("xss");</script>',
        style: 'How-to',
        content: `Bad image <img src="https://url.to.file.which/does-not.exist" onerror="alert(document.cookie);">. But not <strong>all</strong> bad.`
      }
      const sanitizedFolders = [{
        id: 911,
        title: 'Naughty naughty very naughty &lt;script&gt;alert(\"xss\");&lt;/script&gt;',
        style: 'How-to',
        content: `Bad image <img src="https://url.to.file.which/does-not.exist">. But not <strong>all</strong> bad.`
      }]
​
      beforeEach('insert malicious folder', () => {
        return db
          .into('folders')
          .insert([maliciousFolder])
      })
​
      it('responds with 200 and all of the folders, none of which contains XSS attack content', () => {
        return supertest(app)
          .get('/api/folders')
          .expect(200)
          .expect(res => {
            expect(res.body[0].title).to.eql('Naughty naughty very naughty &lt;script&gt;alert(\"xss\");&lt;/script&gt;')
            expect(res.body[0].content).to.eql(`Bad image <img src="https://url.to.file.which/does-not.exist">. But not <strong>all</strong> bad.`)
          })
      })
    })
  })
​
  describe(`GET /api/folders/:folder_id`, () => {
    context(`Given no folders`, () => {
      it(`responds with 404`, () => {
        const folderId = 123456
        return supertest(app)
          .get(`/api/folders/${folderId}`)
          .expect(404, { error: { message: `Folder doesn't exist` } })
      })
    })
​
    context('Given there are folders in the database', () => {
      const testFolders = makeFoldersArray()
​
      beforeEach('insert folders', () => {
        return db
          .into('folders')
          .insert(testFolders)
      })
​
      it('responds with 200 and the specified folder', () => {
        const folderId = 2
        const expectedFolder = testFolders[folderId - 1]
        return supertest(app)
          .get(`/api/folders/${folderId}`)
          .expect(200, expectedFolder)
      })
    })
    context(`Given an XSS attack folder`, () => {
      const maliciousFolder = {
        id: 911,
        title: 'Naughty naughty very naughty <script>alert("xss");</script>',
        style: 'How-to',
        content: `Bad image <img src="https://url.to.file.which/does-not.exist" onerror="alert(document.cookie);">. But not <strong>all</strong> bad.`
      }
​
      beforeEach('insert malicious folder', () => {
        return db
          .into('folders')
          .insert([maliciousFolder])
      })
​
      it('removes XSS attack content', () => {
        return supertest(app)
          .get(`/api/folders/${maliciousFolder.id}`)
          .expect(200)
          .expect(res => {
            expect(res.body.title).to.eql('Naughty naughty very naughty &lt;script&gt;alert(\"xss\");&lt;/script&gt;')
            expect(res.body.content).to.eql(`Bad image <img src="https://url.to.file.which/does-not.exist">. But not <strong>all</strong> bad.`)
          })
      })
    })
  })
​
  describe(`POST /api/folders`, () => {
    it(`creates an folder, responding with 201 and the new folder`, function () {
      this.retries(3);
      const newFolder = {
        title: 'Test new folder',
        style: 'Listicle',
        content: 'Test new folder content...'
      }
      return supertest(app)
        .post('/api/folders')
        .send(newFolder)
        .expect(201)
        .expect(res => {
          expect(res.body.title).to.eql(newFolder.title)
          expect(res.body.style).to.eql(newFolder.style)
          expect(res.body.content).to.eql(newFolder.content)
          expect(res.body).to.have.property('id')
          expect(res.headers.location).to.eql(`/api/folders/${res.body.id}`)
          const expected = new Date().toLocaleString();
          const actual = new Date(res.body.date_published).toLocaleString();
          expect(actual).to.eql(expected)
        })
        .then(postRes =>
          supertest(app)
            .get(`/api/folders/${postRes.body.id}`)
            .expect(postRes.body)
        )
    })
    const requiredFields = ['title', 'style', 'content']
​
    requiredFields.forEach(field => {
      const newFolder = {
        title: 'Test new folder',
        style: 'Listicle',
        content: 'Test new folder content...'
      }
      it(`responds with 400 and an error message when the '${field}' is missing`, () => {
        delete newFolder[field]
        return supertest(app)
          .post('/api/folders')
          .send(newFolder)
          .expect(400, {
            error: { message: `Missing '${field}' in request body` }
          })
      })
    })
​
    context(`Given an XSS attack folder`, () => {
      it(`removes any XSS attack content, and creates an folder, responding with 201`, function () {
        const maliciousFolder = {
          title: 'Naughty naughty very naughty <script>alert("xss");</script>',
          style: 'How-to',
          content: `Bad image <img src="https://url.to.file.which/does-not.exist" onerror="alert(document.cookie);">. But not <strong>all</strong> bad.`
        }
        return supertest(app)
          .post('/api/folders')
          .send(maliciousFolder)
          .expect(201)
          .expect(res => {
            expect(res.body.title).to.eql('Naughty naughty very naughty &lt;script&gt;alert(\"xss\");&lt;/script&gt;')
            expect(res.body.content).to.eql(`Bad image <img src="https://url.to.file.which/does-not.exist">. But not <strong>all</strong> bad.`)
          })
      })
    })
  })
​
  describe(`DELETE /api/folders/:folder_id`, () => {
    context('Given there are folders in the database', () => {
      const testFolders = makeFoldersArray()
      beforeEach('insert folders', () => {
        return db
          .into('folders')
          .insert(testFolders)
      })
      it('responds with 204 and removes the folder', () => {
        const idToRemove = 2
        const expectedFolders = testFolders.filter(folder => folder.id !== idToRemove)
        return supertest(app)
          .delete(`/api/folders/${idToRemove}`)
          .expect(204)
          .then(res =>
            supertest(app)
              .get(`/api/folders`)
              .expect(expectedFolders)
          )
      })
    })
    context(`Given no folders`, () => {
      it(`responds with 404`, () => {
        const folderId = 123456
        return supertest(app)
          .delete(`/api/folders/${folderId}`)
          .expect(404, { error: { message: `Folder doesn't exist` } })
      })
    })
  })
​
  describe.only(`PATCH /api/folders/:folder_id`, () => {
    context(`Given no folders`, () => {
      it(`responds with 404`, () => {
        const folderId = 123456
        return supertest(app)
          .patch(`/api/folders/${folderId}`)
          .expect(404, { error: { message: `Folder doesn't exist` } })
      })
    })
    context('Given there are folders in the database', () => {
      const testFolders = makeFoldersArray()
      beforeEach('insert folders', () => {
        return db
          .into('folders')
          .insert(testFolders)
      })
      it('responds with 204 and updates the folder', () => {
        const idToUpdate = 2
        const updateFolder = {
          title: 'updated folder title',
          style: 'Interview',
          content: 'updated folder content',
        }
        const expectedFolder = {
          ...testFolders[idToUpdate - 1],
          ...updateFolder
        }
        return supertest(app)
          .patch(`/api/folders/${idToUpdate}`)
          .send(updateFolder)
          .expect(204)
          .then(res =>
            supertest(app)
              .get(`/api/folders/${idToUpdate}`)
              .expect(expectedFolder)
          )
      })
      it(`responds with 400 when no required fields supplied`, () => {
        const idToUpdate = 2
        return supertest(app)
          .patch(`/api/folders/${idToUpdate}`)
          .send({ irrelevantField: 'foo' })
          .expect(400, {
            error: {
              message: `Request body must contain either 'title', 'style' or 'content'`
            }
          })
      })
      it(`responds with 204 when updating only a subset of fields`, () => {
        const idToUpdate = 2
        const updateFolder = {
          title: 'updated folder title',
        }
        const expectedFolder = {
          ...testFolders[idToUpdate - 1],
          ...updateFolder
        }
​
        return supertest(app)
          .patch(`/api/folders/${idToUpdate}`)
          .send({
            ...updateFolder,
            fieldToIgnore: 'should not be in GET response'
          })
          .expect(204)
          .then(res =>
            supertest(app)
              .get(`/api/folders/${idToUpdate}`)
              .expect(expectedFolder)
          )
      })
    })
  })
})