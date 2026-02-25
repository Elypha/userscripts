// ==UserScript==
// @name         booth.pm: Grid Image Viewer
// @namespace    https://github.com/Elypha/userscript
// @version      1.3
// @description  View all preview images in an overlay with a main viewer and a thumbnail grid.
// @author       Elypha
// @match        https://booth.pm/*/items/*
// @match        https://*.booth.pm/items/*
// @grant        GM_addStyle
// @require      https://cdn.jsdelivr.net/npm/jquery@4.0.0/dist/jquery.js
// @require      https://cdn.jsdelivr.net/npm/lightbox2@2.11.5/dist/js/lightbox.min.js
// ==/UserScript==

(function ($) {
    'use strict';

    function getImageLinks() {
        var urls = $("div.primary-image-area div.slick-track div.slick-slide[data-slick-index]")
            .filter(function () {
                return !$(this).hasClass('slick-cloned');
            })
            .map(function () {
                // a) The original size can sometimes be 4K and may take longer time to load.
                // return $(this).find("img").attr("data-origin");

                // b) `data-lazy` returns *_base_resized, usually 1024px
                // NOTE: when the image has been displayed, `data-lazy` will be removed and replaced with `src`
                // https://booth.pximg.net/acea9fa6-7b8c-4604-9087-5195334e9488/i/6397984/fa23b827-7f88-4db7-a7ba-a781f4525457_base_resized.jpg
                return $(this).find("img").attr("data-lazy") || $(this).find("img").attr("src");
            })
            .toArray();
        return urls;
    }

    GM_addStyle(`
        .image-viewer-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            z-index: 9999;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 20px;
            box-sizing: border-box;
        }
        .image-viewer-main-view {
            width: 80%;
            height: 70%;
            margin-bottom: 15px;
            display: flex;
            justify-content: center;
            align-items: center;
        }
        .image-viewer-main-view img {
            max-width: 100%;
            max-height: 100%;
            object-fit: contain;
        }
        .image-viewer-grid {
            width: 85%;
            height: 25%;
            overflow-y: auto;
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
            gap: 10px;
            background: #333;
            padding: 10px;
            border-radius: 5px;
        }
        .image-viewer-grid img {
            width: 100%;
            height: auto;
            cursor: pointer;
            border: 2px solid transparent;
            transition: border-color 0.3s;
        }
        .image-viewer-grid img:hover, .image-viewer-grid img.selected {
            border-color: #00aaff;
        }
        .image-viewer-close-btn {
            position: absolute;
            top: 20px;
            right: 30px;
            font-size: 30px;
            color: white;
            cursor: pointer;
        }
        .view-images-btn {
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 9998;
            padding: 10px 20px;
            background-color: #007bff;
            color: white;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-size: 16px;
        }

        /* Custom Scrollbar */
        .image-viewer-grid::-webkit-scrollbar {
            width: 8px;
        }
        .image-viewer-grid::-webkit-scrollbar-track {
            background: #555;
            border-radius: 4px;
        }
        .image-viewer-grid::-webkit-scrollbar-thumb {
            background: #888;
            border-radius: 4px;
        }
        .image-viewer-grid::-webkit-scrollbar-thumb:hover {
            background: #aaa;
        }
    `);

    // Viewer functionality
    function openImageViewer() {
        if (document.querySelector('.image-viewer-overlay')) return;

        const imageUrls = getImageLinks();
        if (!imageUrls || imageUrls.length === 0) {
            alert("No images found.");
            return;
        }

        const overlay = document.createElement('div');
        overlay.className = 'image-viewer-overlay';
        document.body.appendChild(overlay);

        const mainView = document.createElement('div');
        mainView.className = 'image-viewer-main-view';
        const mainImage = document.createElement('img');
        mainImage.src = imageUrls[0];
        mainView.appendChild(mainImage);

        const grid = document.createElement('div');
        grid.className = 'image-viewer-grid';

        const closeButton = document.createElement('span');
        closeButton.className = 'image-viewer-close-btn';
        closeButton.innerHTML = '&times;';
        closeButton.onclick = () => document.body.removeChild(overlay);

        overlay.append(closeButton, mainView, grid);

        imageUrls.forEach((url, index) => {
            const thumb = document.createElement('img');
            thumb.src = url;
            thumb.dataset.index = index;
            if (index === 0) thumb.classList.add('selected');

            thumb.addEventListener('click', () => {
                mainImage.src = url;
                grid.querySelector('.selected')?.classList.remove('selected');
                thumb.classList.add('selected');
            });

            grid.appendChild(thumb);
        });
    }

    const viewButton = document.createElement('button');
    viewButton.innerText = 'View Images';
    viewButton.className = 'view-images-btn';
    document.body.appendChild(viewButton);

    viewButton.addEventListener('click', openImageViewer);


    // Keyboard navigation
    // --------------------------------
    // Usage:
    // - Tab: Open/close viewer
    // - Left/Right Arrows, A/D: Navigate through images when viewer is open
    //
    // Notes:
    // - Block default key actions by `event.preventDefault()` to avoid conflicts
    // - When navigating with arrows, the selected thumbnail will be scrolled into view if it's out of the visible area
    // - The navigation loops around when reaching the first or last image
    document.addEventListener('keydown', function(event) {
        const overlay = document.querySelector('.image-viewer-overlay');
        let eventKeyNormalised = event.key.toLowerCase();

        if (eventKeyNormalised === 'tab') {
            event.preventDefault();
            if (overlay) {
                document.body.removeChild(overlay);
            } else {
                openImageViewer();
            }
            return;
        }

        if (overlay) {
            if (eventKeyNormalised === 'arrowleft' || eventKeyNormalised === 'a' || eventKeyNormalised === 'arrowright' || eventKeyNormalised === 'd') {
                event.preventDefault();

                const thumbnails = overlay.querySelectorAll('.image-viewer-grid img');
                if (thumbnails.length <= 1) return;

                const currentSelected = overlay.querySelector('.image-viewer-grid img.selected');
                let currentIndex = 0;

                if (currentSelected) {
                    currentIndex = parseInt(currentSelected.dataset.index, 10);
                }

                let newIndex = currentIndex;

                if (eventKeyNormalised === 'arrowleft' || eventKeyNormalised === 'a') {
                    newIndex = (currentIndex - 1 + thumbnails.length) % thumbnails.length;
                } else if (eventKeyNormalised === 'arrowright' || eventKeyNormalised === 'd') {
                    newIndex = (currentIndex + 1) % thumbnails.length;
                }

                if (newIndex !== currentIndex) {
                    const targetThumb = thumbnails[newIndex];

                    targetThumb.click();

                    targetThumb.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }
            }
        }
    });

})(jQuery);
