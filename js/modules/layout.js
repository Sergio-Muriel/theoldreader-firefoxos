var Layout = function()
{
    var buttons=  document.querySelectorAll('.header button');
    var left = document.querySelector('.slide.left .slide_content')

    var slides = document.querySelector('.slides');
    var button_left = document.querySelector('.button_left');
    var button_right = document.querySelector('.button_right');

    this.init = function(controller)
    {
        this.controller = controller;
        this.bind();
    };

    this.display_left= function()
    {
        if(button_left.classList.contains('selected'))
        {
            return this.display_center();
        }
        slides.className='slides left_selected';

        Array.forEach( buttons, function(button)
        {
            button.classList.remove('selected');
        });
        button_left.classList.add('selected');
    };

    this.display_right= function()
    {
        if(button_right.classList.contains('selected'))
        {
            return this.display_center();
        }
        slides.className='slides right_selected';
        Array.forEach( buttons, function(button)
        {
            button.classList.remove('selected');
        });
        document.querySelector('.button_right').classList.add('selected');
    };

    this.display_center= function()
    {
        Array.forEach( buttons, function(button)
        {
            button.classList.remove('selected');
        });
        slides.className='slides';
    };

    this.bind =  function()
    {
        document.querySelector('.header h1').addEventListener('click', this.display_center.bind(this));
        document.querySelector('.header .button_left').addEventListener('click', this.display_left.bind(this));
        document.querySelector('.header .button_right').addEventListener('click', this.display_right.bind(this));
    };


    this.update_leftlist= function()
    {
        console.log('update left list');

        Promise.all([ this.controller.getFeeds(), this.controller.getLabels()])
        .then(function(values)
                {
                    var feeds = values[0];
                    var labels = values[1];
                    console.log('labels ', labels);

                    // @TODO do not remove all, only update...

                    // Empty previous list
                    while (left.firstChild) {
                        left.removeChild(left.firstChild);
                    }
                    // Append all items
                    var ul= document.createElement('ul');
                    Array.forEach(labels, function(label)
                    {
                        var li = document.createElement('li');
                        li.innerHTML= ' \
                                <p class="label_toggle"><span data-icon="add"></span></p>\
                                <p class="label">'+label.id.replace(/.*label\//,'')+'</p>\
                                ';
                        ul.appendChild(li);
                    });
                    console.log('update feeds layout');
                    left.appendChild(ul);
                });

    };
};

