const express = require('express');
const path = require('path');
const xss = require('xss');
const FoldersService = require('./folders-service');

const foldersRouter = express.Router()
const jsonParser = express.json()

/* We sanitize folder content a few times,
   so let's wrap that process in a function
 */
const sanitizeFolder = (folder) => ({
  id: folder.id,
  name: xss(folder.name) // sanitize title
});


foldersRouter
  .route('/')
  .get((req, res, next) => {
    FoldersService.getAllFolders(
      req.app.get('db')
    )
      .then(folders => {
        let foldersCleaned = folders.map(folder => sanitizeFolder(folder));
        res.json(foldersCleaned);
      })
      .catch(next)
  })
  .post(jsonParser, (req, res, next) => {
    const { name } = req.body
    const newFolder = { name }
    for (const [key, value] of Object.entries(newFolder)) {
      if (value == null) {
        return res.status(400).json({
          error: { message: `Missing '${key}' in request body` }
        })
      }
    }
    
    FoldersService.insertFolder(
      req.app.get('db'),
      newFolder
    )
      .then(folder => {
        res
          .status(201)
          .location(path.posix.join(req.originalUrl, `/${folder.id}`))
          .json(sanitizeFolder(folder))
      })
      .catch(next)
  })

foldersRouter
  .route('/:folder_id')
  .all((req, res, next) => {
    FoldersService.getById(
      req.app.get('db'),
      req.params.folder_id
    )
      .then(folder => {
        if (!folder) {
          return res.status(404).json({
            error: { message: `Folder doesn't exist` }
          })
        }
        res.folder = folder // save the folder for the next middleware
        next() // don't forget to call next so the next middleware happens!
      })
      .catch(next)
  })
  .get((req, res, next) => {
    res.json(sanitizeFolder(res.folder))
  })
  // .delete((req, res, next) => {
  //   FoldersService.deleteFolder(
  //     req.app.get('db'),
  //     req.params.folder_id
  //   )
  //     .then(() => {
  //       res.status(204).end()
  //     })
  //     .catch(next)
  // })
  // .patch(jsonParser, (req, res, next) => {
  //   const { title, content, style } = req.body
  //   const folderToUpdate = { title, content, style }

  //   const numberOfValues = Object.values(folderToUpdate).filter(Boolean).length
  //   if (numberOfValues === 0) {
  //     return res.status(400).json({
  //       error: {
  //         message: `Request body must contain either 'title', 'style' or 'content'`
  //       }
  //     })
  //   }

    // FoldersService.updateFolder(
    //   req.app.get('db'),
    //   req.params.folder_id,
    //   folderToUpdate
    // )
    //   .then(numRowsAffected => {
    //     res.status(204).end()
    //   })
  //   //   .catch(next)
  // })

module.exports = foldersRouter