// ==UserScript==
// @name         GitHub PR review keyboard shortcut
// @version      0.4.0
// @description  Toggle the PR file under the pointer with Space and advance to the next file
// @match        https://github.com/*/*/pull/*
// @author       dvdvdmt, nbolton, bdice
// @source       https://github.com/bdice/github-review-shortcut
// @namespace    https://github.com/bdice/github-review-shortcut
// @license      MIT
// @downloadURL  https://raw.githubusercontent.com/bdice/github-review-shortcut/main/main.js
// @updateURL    https://raw.githubusercontent.com/bdice/github-review-shortcut/main/main.js
// @run-at       document-start
// @grant        none
// ==/UserScript==

(() => {
    'use strict';

    const POSSIBLE_DIFF_SELECTOR = [
        // Redesigned Files changed page. Checking for a Viewed control below
        // prevents an unrelated region from being mistaken for a file diff.
        'div[role="region"]',
        // Classic Files changed page.
        '.js-details-container[data-details-container-group="file"]',
    ].join(',');

    const VIEWED_CONTROL_SELECTOR = [
        'button[aria-label="Not Viewed" i]',
        'button[aria-label="Viewed" i]',
        'input.js-reviewed-checkbox[type="checkbox"]',
        'input[type="checkbox"][data-ga-click*="viewed" i]',
    ].join(',');

    let pointerPosition = null;

    // Remember the element under the pointer. This is more reliable than :hover
    // while a keyboard event is being dispatched.
    window.addEventListener('pointermove', (event) => {
        pointerPosition = {x: event.clientX, y: event.clientY};
    }, {capture: true, passive: true});

    window.addEventListener('keydown', (event) => {
        if (event.code !== 'Space' || event.repeat || isTypingTarget(event.target)) return;

        const diff = findHoveredDiff();
        if (!diff) {
            console.debug('[github-review-shortcut] No file diff under the pointer');
            return;
        }

        const control = findViewedControl(diff);
        if (!control) {
            console.debug('[github-review-shortcut] No Viewed control was found');
            return;
        }

        // Space normally scrolls the page and may activate a focused control.
        // This click is the only activation we want after recognizing a file.
        event.preventDefault();
        event.stopImmediatePropagation();

        const wasHidden = isViewed(control);
        const scrollTarget = wasHidden ? diff : findNextDiff(diff);

        control.click();
        scrollToTopAfterLayout(scrollTarget ?? diff);

        console.debug(
            wasHidden
                ? '[github-review-shortcut] Unhid file'
                : '[github-review-shortcut] Hid file and advanced',
            diff
        );
    }, true); // Capture Space before GitHub's handlers can stop propagation.

    function isTypingTarget(target) {
        return target instanceof Element && Boolean(target.closest(
            'input:not([type="checkbox"]), textarea, select, [contenteditable="true"], [role="textbox"]'
        ));
    }

    function findHoveredDiff() {
        if (pointerPosition) {
            let element = document.elementFromPoint(
                pointerPosition.x,
                pointerPosition.y
            );

            while (element) {
                if (element.matches(POSSIBLE_DIFF_SELECTOR) && hasViewedControl(element)) {
                    return element;
                }
                element = element.parentElement;
            }
        }

        // Fallback for keyboard use before the first pointermove event.
        return [...document.querySelectorAll(POSSIBLE_DIFF_SELECTOR)]
            .find((element) => element.matches(':hover') && hasViewedControl(element)) ?? null;
    }

    function hasViewedControl(diff) {
        return Boolean(findViewedControl(diff));
    }

    function findViewedControl(diff) {
        return [...diff.querySelectorAll(VIEWED_CONTROL_SELECTOR)]
            .find((control) => findOwningDiff(control) === diff) ?? null;
    }

    function findOwningDiff(element) {
        return element.closest(POSSIBLE_DIFF_SELECTOR);
    }

    function isViewed(control) {
        if (control instanceof HTMLInputElement) return control.checked;

        const pressed = control.getAttribute('aria-pressed');
        if (pressed !== null) return pressed === 'true';

        return control.getAttribute('aria-label')?.toLowerCase() === 'viewed';
    }

    function getRenderedDiffs() {
        const diffs = [];
        const seen = new Set();

        for (const control of document.querySelectorAll(VIEWED_CONTROL_SELECTOR)) {
            const diff = findOwningDiff(control);
            if (diff && !seen.has(diff)) {
                seen.add(diff);
                diffs.push(diff);
            }
        }

        return diffs;
    }

    function findNextDiff(currentDiff) {
        const diffs = getRenderedDiffs();
        const currentIndex = diffs.indexOf(currentDiff);
        return currentIndex >= 0 ? diffs[currentIndex + 1] ?? null : null;
    }

    function scrollToTopAfterLayout(target) {
        // Give GitHub two rendering frames to collapse or expand the diff first.
        requestAnimationFrame(() => requestAnimationFrame(() => {
            if (target.isConnected) {
                target.scrollIntoView({block: 'start', behavior: 'auto'});

                // scrollIntoView aligns with the viewport, underneath GitHub's
                // sticky PR header. Move back by the actual covered height so
                // the file starts at the top of the visible diff region.
                const topInset = getTopViewportInset(target);
                if (topInset > 0) window.scrollBy(0, -topInset);
            }
        }));
    }

    function getTopViewportInset(target) {
        const targetRect = target.getBoundingClientRect();
        const sampleX = Math.min(
            Math.max(targetRect.left + Math.min(24, targetRect.width / 2), 1),
            window.innerWidth - 2
        );

        return document.elementsFromPoint(sampleX, 1).reduce((inset, element) => {
            const style = getComputedStyle(element);
            if (style.position !== 'fixed' && style.position !== 'sticky') {
                return inset;
            }

            const rect = element.getBoundingClientRect();
            const coversViewportTop = rect.top <= 1 && rect.bottom > 0;
            const isReasonableHeader = rect.height < window.innerHeight / 2;

            return coversViewportTop && isReasonableHeader
                ? Math.max(inset, rect.bottom)
                : inset;
        }, 0);
    }
})();
