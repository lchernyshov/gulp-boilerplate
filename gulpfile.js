const {src, dest, watch, series, parallel} = require('gulp')

/* general */
const rename = require('gulp-rename')
const del = require('del')
const path = require('path')
const mode = require('gulp-mode')({
    modes: ['development', 'production'],
    default: 'development'
})

/* scripts */
const compiler = require('webpack')
const webpack = require('webpack-stream')

/* styles */
const sass = require('gulp-sass')
const postcss = require('gulp-postcss')
const prefix = require('autoprefixer')
const minify = require('cssnano')
const sourcemaps = require('gulp-sourcemaps')

/* images */
const newer = require('gulp-newer')
const imagemin = require('gulp-imagemin')

/* browser sync */
const browserSync = require('browser-sync').create()

const paths = {
    input: 'src/',
    output: 'dist/',
    scripts: {
        input: 'src/js/**/*',
        output: 'dist/js/'
    },
    styles: {
        input: 'src/scss/**/*.scss',
        output: 'dist/css/'
    },
    images: {
        input: 'src/images/**/*',
        output: 'dist/images/'
    },
    html: {
        input: 'src/*.html',
        output: 'dist/'
    },
    fonts: {
        input: 'src/fonts/**/*',
        output: 'dist/fonts/'
    },
    reload: './dist'
}

const isDev = mode.development()
const idProd = !isDev

const cleanDist = (cb) => {
    del.sync([
        paths.output + '**/*'
    ])

    return cb()
}

const buildScripts = () => {
    return src('src/js/main.js')
        .pipe(webpack({
            entry: './src/js/main.js',
            output: {
                filename: 'main.js',
                path: path.resolve(__dirname, 'dist/js')
            },
            mode: isDev ? 'development' : 'production',
            devtool: isDev ? 'eval-cheap-module-source-map' : false,
            module: {
                rules: [
                    {
                        test: /\.js$/,
                        loader: 'babel-loader',
                        exclude: '/node_modules/',
                        options: {
                            presets: ['@babel/preset-env']
                        }
                    }
                ]
            }
        }, compiler))
        .pipe(dest('dist/js/'))
}

const buildStyles = () => {
    return src(paths.styles.input)
        .pipe(mode.development(sourcemaps.init()))
        .pipe(sass({
            outputStyle: 'expanded',
            sourceComments: true
        }).on('error', sass.logError))
        .pipe(postcss([
            prefix({
                cascade: true,
                remove: true
            })
        ]))
        .pipe(rename({suffix: '.min'}))
        .pipe(postcss([
            minify({
                discardComments: {
                    removeAll: true
                }
            })
        ]))
        .pipe(mode.development(sourcemaps.write('.')))
        .pipe(dest(paths.styles.output))
        .pipe(browserSync.stream())
}

const buildImages = () => {
    return src(paths.images.input)
        .pipe(newer(paths.images.input))
        .pipe(mode.production(imagemin([
            imagemin.gifsicle({interlaced: true}),
            imagemin.mozjpeg({quality: 75, progressive: true}),
            imagemin.optipng({optimizationLevel: 5}),
            imagemin.svgo({
                plugins: [
                    {removeViewBox: true},
                    {cleanupIDs: true}
                ]
            })
        ])))
        .pipe(dest(paths.images.output))
}

const buildHtml = () => {
    return src(paths.html.input)
        .pipe(dest(paths.html.output))
}

const buildFonts = () => {
    return src(paths.fonts.input)
        .pipe(dest(paths.fonts.output))
}

const startServer = (cb) => {
    browserSync.init({
        server: {
            baseDir: paths.reload
        },
        notify: false,
        browser: "Google Chrome"
    })

    watch(paths.styles.input, buildStyles)
    watch(paths.scripts.input, buildScripts).on('change', browserSync.reload)
    watch(paths.images.input, buildImages).on('change', browserSync.reload)
    watch(paths.html.input, buildHtml).on('change', browserSync.reload)
    watch(paths.fonts.input, buildFonts).on('change', browserSync.reload)

    cb()
}

exports.clean = cleanDist
exports.styles = buildStyles
exports.scripts = buildScripts
exports.images = buildImages
exports.html = buildHtml
exports.fonts = buildFonts

exports.default = exports.build = series(
    cleanDist,
    parallel(
        buildHtml,
        buildFonts,
        buildImages,
        buildStyles,
        buildScripts,
    )
)

exports.watch = series(
    exports.default,
    startServer
)
