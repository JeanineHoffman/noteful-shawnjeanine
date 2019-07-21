module.exports = {
    PORT: process.env.PORT || 8000,
    NODE_ENV: process.env.NODE_ENV || 'development',
    DB_URL: process.env.DATABASE_URL || 'postgresql://dunder-mifflin@localhost/noteful',
    TEST_DB_URL: process.env.TEST_DB_URL || 'postgresql://dunder-mifflin@localhost/noteful-test',
  //   API_ENDPOINT: `https://thawing-mesa-25904.herokuapp.com/`,
  // API_KEY: process.env.REACT_APP_API_KEY,
  }
  