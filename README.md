# zAnimate
js动画插件：支持自定义动画；支持css属性auto动画；支持滚动动画；支持增量动画

example:

    $('#test').zAnimate({
      width:{to:'auto'},
      height:{to:200}
    });
    
     $('#test').zAnimate({
      scrollTop:{delta:120},
      scrollLeft:{to:200}
    });
