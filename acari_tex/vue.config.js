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

  iconPaths: {
    favicon32: 'img/Logo.png',
    favicon16: 'img/Logo.png',
    appleTouchIcon: 'img/Logo.png',
    maskIcon: 'img/Logo.png',
    msTileImage: 'img/Logo.png'
  }
}

})