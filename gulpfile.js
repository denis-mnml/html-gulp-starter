const { src, dest, parallel, series, watch } = require('gulp')
const mode = require('gulp-mode')()
const browserSync = require('browser-sync').create()
const babel = require('gulp-babel')
const uglify = require('gulp-uglify')
const fileInclude = require('gulp-file-include')
const replace = require('gulp-replace')
const sass = require('gulp-sass')
const cleancss = require('gulp-clean-css')
const autoprefixer = require('gulp-autoprefixer')
const rename = require('gulp-rename')
const imagemin = require('gulp-imagemin')
const ttf2woff2 = require('gulp-ttf2woff2')
const svgSprite = require('gulp-svg-sprite')
const svgmin = require('gulp-svgmin')
const cheerio = require('gulp-cheerio')
const del = require('del')

const filesWatch = 'php,txt,json'

const isProd = mode.production()
const isDev = mode.development()
const prodMod = mode.production
const devMod = mode.development

function browsersync() {
  browserSync.init({
    server: {
      baseDir: 'src/',
    },
    ghostMode: { clicks: false },
    notify: false,
    online: true,
    // open: false
    // tunnel: 'yousutename', // Attempt to use the URL https://yousutename.loca.lt
  })
}

function html() {
  return (
    src('src/html/*.html')
      .pipe(fileInclude())
      // .pipe(prodMod(replace('assets/', ''))) // replace path for styles and scripts
      .pipe(dest(isProd ? 'dist' : 'src'))
      .pipe(browserSync.stream())
  )
}

function css() {
  return src('src/sass/main.sass')
    .pipe(sass())
    .pipe(
      prodMod(
        autoprefixer({
          overrideBrowserslist: ['last 10 versions'],
          grid: true,
        })
      )
    )
    .pipe(cleancss({ level: isProd ? 2 : 0 }))
    .pipe(rename({ suffix: '.min' }))
    .pipe(dest(isProd ? 'dist/assets/css' : 'src/assets/css'))
    .pipe(browserSync.stream())
}

function js() {
  return src('src/js/main.js')
    .pipe(
      fileInclude({
        prefix: '__',
      })
    )
    .pipe(
      babel({
        presets: ['@babel/env'],
        plugins: ['@babel/transform-runtime'],
      })
    )
    .pipe(prodMod(uglify()))
    .pipe(rename('main.min.js'))
    .pipe(dest(isProd ? 'dist/assets/js' : 'src/assets/js'))
    .pipe(browserSync.stream())
}

function jsLibs() {
  return src('src/js/libs.js')
    .pipe(
      fileInclude({
        prefix: '__',
        basepath: '@root',
      })
    )
    .pipe(prodMod(uglify()))
    .pipe(rename('libs.min.js'))
    .pipe(dest(isProd ? 'dist/assets/js' : 'src/assets/js'))
    .pipe(browserSync.stream())
}

function img() {
  return src('src/assets/img/*.{jpg, jpeg, png}')
    .pipe(imagemin())
    .pipe(dest('dist/assets/img'))
    .pipe(browserSync.stream())
}

function svg() {
  return (
    src('src/svg-sprite/**/*.svg')
      .pipe(
        svgmin({
          plugins: [
            { removeDoctype: true },
            { removeComments: true },
            { removeStyleElement: true },
            { removeXMLNS: true },
            { removeTitlte: true },
            { removeDimensions: true },
            { removeHiddenElems: true },
            {
              removeAttrs: {
                attrs: 'class',
              },
            },
            { collapseGroups: true },
            { convertPathData: true },
            {
              convertShapeToPath: {
                convertArcs: true,
              },
            },
            { mergePaths: true },
          ],
          js2svg: { pretty: true, indent: 2 },
        })
      )
      .pipe(
        svgSprite({
          mode: {
            symbol: { sprite: '../sprite.svg' },
          },
        })
      )
      .pipe(dest(isProd ? 'dist/assets/img' : 'src/assets/img'))
  )
}

function fonts() {
  return src('src/assets/fonts/ttf/*.*')
    .pipe(ttf2woff2())
    .pipe(dest(isProd ? 'dist/assets/fonts' : 'src/assets/fonts'))
}


function cleanDist() {
  return del('dist/**/*', { force: true })
}

function buildCopy() {
	return src(['src/assets/favicon/**/*'], { base: 'src/' })
	.pipe(dest('dist'))
}

function deploy() {
  return src('dist/').pipe(
    rsync({
      root: 'dist/',
      hostname: 'username@yousite.com',
      destination: 'yousite/public_html/',
      // clean: true, // Mirror copy with file deletion
      include: [
        /* '*.htaccess' */
      ], // Included files to deploy,
      exclude: ['**/Thumbs.db', '**/*.DS_Store'],
      recursive: true,
      archive: true,
      silent: false,
      compress: true,
    })
  )
}

function watchFiles() {
  watch(['src/html/**/*.html'], { usePolling: true }, html)
  watch('src/sass/**/*.s(a|c)ss', { usePolling: true }, css)
  watch(['src/js/**/*.js', '!src/js/libs.js'], { usePolling: true }, js)
  watch('src/js/libs.js', { usePolling: true }, jsLibs)
  watch('src/svg-sprite/**/*.svg', { usePolling: true }, svg)
  watch('src/assets/fonts/ttf/**/*.ttf', { usePolling: true }, fonts)
  watch(`src/**/*.{${filesWatch}}`, { usePolling: true }).on('change', browserSync.reload)
}

exports.svg = svg
exports.fonts = fonts
exports.deploy = deploy
exports.build = series(cleanDist, html, css, js, jsLibs, img, svg, fonts, buildCopy)
exports.default = series(html, css, js, jsLibs, svg, parallel(browsersync, watchFiles))
