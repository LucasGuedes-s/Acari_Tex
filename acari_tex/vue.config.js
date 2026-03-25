const { defineConfig } = require('@vue/cli-service')

module.exports = defineConfig({
  transpileDependencies: true,

  pages: {
    index: {
      entry: 'src/main.js',
      template: 'public/index.html',
      filename: 'index.html',
      title: 'Linha Tex 🚀',
    }
  },

  pwa: {
    name: 'Linha Tex',
    themeColor: '#0d3927',
    msTileColor: '#0d3927',

    manifestOptions: {
      name: 'Linha Tex',
      short_name: 'LinhaTex',
      start_url: '.',
      display: 'standalone',
      background_color: '#0d3927',
      theme_color: '#0d3927'
    }
  }

})