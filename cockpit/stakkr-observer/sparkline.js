"use strict";

function drawSparkline(canvas, data, opts) {
    if (!canvas || !data || data.length < 2) return;

    opts = opts || {};
    var color = opts.color || "#06c";
    var fillColor = opts.fill || null;
    var lineWidth = opts.lineWidth || 1.5;
    var spotColor = opts.spotColor || null;
    var spotRadius = opts.spotRadius || 2.5;

    var dpr = window.devicePixelRatio || 1;
    var cw = canvas.clientWidth;
    var ch = canvas.clientHeight;
    canvas.width = cw * dpr;
    canvas.height = ch * dpr;

    var ctx = canvas.getContext("2d");
    ctx.scale(dpr, dpr);

    var minVal = opts.min !== undefined ? opts.min : Math.min.apply(null, data);
    var maxVal = opts.max !== undefined ? opts.max : Math.max.apply(null, data);
    var range = maxVal - minVal;
    if (range === 0) range = 1;

    var pad = lineWidth;
    var drawH = ch - pad * 2;
    var drawW = cw - pad * 2;

    function xPos(i) {
        return pad + (i / (data.length - 1)) * drawW;
    }

    function yPos(v) {
        return pad + drawH - ((v - minVal) / range) * drawH;
    }

    ctx.clearRect(0, 0, cw, ch);

    if (fillColor) {
        ctx.beginPath();
        ctx.moveTo(xPos(0), ch);
        for (var i = 0; i < data.length; i++) ctx.lineTo(xPos(i), yPos(data[i]));
        ctx.lineTo(xPos(data.length - 1), ch);
        ctx.closePath();
        ctx.fillStyle = fillColor;
        ctx.fill();
    }

    ctx.beginPath();
    for (var j = 0; j < data.length; j++) {
        var x = xPos(j);
        var y = yPos(data[j]);
        if (j === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.stroke();

    if (spotColor) {
        var lastX = xPos(data.length - 1);
        var lastY = yPos(data[data.length - 1]);
        ctx.beginPath();
        ctx.arc(lastX, lastY, spotRadius, 0, Math.PI * 2);
        ctx.fillStyle = spotColor;
        ctx.fill();
    }
}
