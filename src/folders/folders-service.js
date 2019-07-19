const FoldersService = {
  getAllFolders(knexInstance) {
      return knexInstance.select('*').from('noteful-folders')
  },

  insertFolder(knexInstance, newFolder) {
      return knexInstance
          .insert(newFolder)
          .into('noteful_folders')
          .returning('*')
          .then(rows => {
              return rows[0]
          })
  },

  getById(knexInstance, foldersID) {
      return knexInstance
          .from('noteful_folders')
          .select('*')
          .where('id', foldersID)
          .first()
  },

  deleteFolder(knexInstance, id) {
      return knexInstance('noteful_folders')
          .where({ id })
          .delete()
  },

  updateFolder(knexInstance, id, newFolderFields) {
      return knexInstance('noteful_folders')
          .where({ id })
          .update(newFolderFields)
  },
}

module.exports = FoldersService