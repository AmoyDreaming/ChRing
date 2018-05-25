// global variables
var width = 800,
    height = 800;
    geneWidth = 60;
    paWidth = 50;
    radius = Math.min(width, height) / 2;

var data = [];
var paposition = [];
var pdata = [];
var summary = {'species': 'ARAB', 'chr': 'chloroplast', 'length': 0, 'gene': 0, 'pa': 0};
var colors = [];

// dependence
var $ = require("jquery");
var d3 = require("d3");
var ColorHash = require("color-hash");
var MongoClient1 = require("mongodb").MongoClient;
var MongoClient2 = require("mongodb").MongoClient;

// create svg figure
var svg = d3.select("#chr").append("svg")
    .attr("width", width)
    .attr("height", height)
    .append("g")
    .attr("transform", "translate(" + width/2 + "," + height/2 + ")");

// get data and draw gene
MongoClient1.connect('mongodb://localhost:27017/arab', function(err, db) {
    cursor = db.collection('chloroplast').find().sort({'start': 1});
    cursor.toArray().then(function(docs){
        var lastEnd = 0;
        for(i = 0; i < docs.length; i ++){
            doc = docs[i];
            if(doc['start'] - lastEnd > 1){
                data.push({'gene': 'intron', 'len': doc['start'] - lastEnd});
                colorHash = new ColorHash();
                colors.push('#ffffff');
            }
            colorHash = new ColorHash();
            colors.push(colorHash.hex(doc['gene'].slice(3)));
            data.push({
                'gene': doc['gene'],
                'type': doc['type'],
                'len': Math.abs(doc['end']-doc['start']),
                'start': doc['start'],
                'end': doc['end'],
                'pa': doc['pa']
            });
            lastEnd = Math.max(doc['start'], doc['end']);
        }

        // create gene arc model
        var arc_ge = d3.arc()
            .outerRadius(radius)
            .innerRadius(radius - geneWidth);

        // create gene pie model
        var pie_ge = d3.pie()
            .startAngle(-0.25 * Math.PI)
            .endAngle(1.74 * Math.PI)
            .sort(null)
            .value(function(d){
                return d.len;
            });

        // draw gene
        svg.selectAll('.gene')
            .data(pie_ge(data))
          .enter().append('path')
            .attr('d', arc_ge)
            .style('fill', function(d){return colors[d.index];})
            .style('stroke', function(d){return colors[d.index];})
            .attr('class', 'gene')
            .attr('index', function(d){return d.index;})
            .on('mouseover', over)
            .on('click', click)
            .on('contextmenu', rightclick);

        // create summary arc model
        var arc_su = d3.arc()
            .outerRadius(radius - geneWidth - paWidth)
            .innerRadius(0)
            .startAngle(0)
            .endAngle(2 * Math.PI);

        // draw summary
        svg.append('path')
            .attr('d', arc_su)
            .style('fill', 'pink');

        $('#species').html(summary.species);
        $('#chrname').html(summary.chr);
        $('#genenum').html('GENE NUM: '+summary.gene);
        $('#panum').html('PA NUM: '+summary.pa);

        db.close();
    });
});

MongoClient2.connect('mongodb://localhost:27017/plantAPA', function(err, db) {
    cursor_1 = db.collection('t_arab_pa1').find({"chr":"chloroplast"});
    cursor_1.toArray().then(function(docs1){
        cursor_2 = db.collection('t_arab_pa2').find({"chr":"chloroplast"});
        cursor_2.toArray().then(function(docs2){
            for(i = 0; i < docs1.length; i ++){
                doc = docs1[i];
                paposition.push(parseInt(doc['coord']));
            }

            for(i = 0; i < docs2.length; i ++){
                doc = docs2[i];
                if(paposition.indexOf(parseInt(doc['coord'])) == -1){
                    paposition.push(parseInt(doc['coord']));
                }
            }

            paposition.sort(function(a,b){return a-b;});

            var endposition;
            
            cursor = db.collection('t_arab_gff').find({"chr":"chloroplast"}).sort({"ftr_end": -1});
            cursor.toArray().then(function(docs){
                doc = docs[0];
                endposition = doc['ftr_end'];
                var lastPos = 0;
                for(i = 0; i < paposition.length; i ++){
                    pos = paposition[i];
                    if(pos - lastPos > 1){
                        pdata.push({'pos':lastPos+1,'len':pos-lastPos,'type':'none'});
                    }
                    pdata.push({'pos':pos,'len':1,'type':'pa'});
                    lastPos = pos;
                    if(i == paposition.length -1 && endposition - lastPos > 0){
                        pdata.push({'pos':lastPos+1,'len':endposition - lastPos});
                    }
                }
                
                console.log(endposition,lastPos,endposition - lastPos);

                // create pa arc model
                var arc_pa = d3.arc()
                    .outerRadius(radius - geneWidth)
                    .innerRadius(radius - geneWidth - paWidth);

                // create pa pie model
                var pie_pa = d3.pie()
                    .startAngle(-0.25 * Math.PI)
                    .endAngle(1.74 * Math.PI)
                    .sort(function(d){
                        return -d.pos;
                    })
                    .value(function(d){
                        return d.len;
                    })
                    .padAngle(0);;

                // draw pa
                svg.selectAll('.chrpa')
                    .data(pie_pa(pdata))
                    .enter().append('path')
                    .attr('d', arc_pa)
                    .style('fill', function(d){
                        if(d.type == 'pa') return '#333333';
                        else return '#ffffff';
                    })
                    .style('stroke', '#333333')
                    .attr('class', 'pa');

                db.close();
            });
        });
    });
});

function over(){
    index = this.getAttribute('index');
    drawGene(index);
}

function click(){
    d3.selectAll('.gene').on('mouseover', null);
    index = this.getAttribute('index');
    drawGene(index);
}

function rightclick(){
    d3.selectAll('.gene').on('mouseover', over);
    index = this.getAttribute('index');
    drawGene(index);
}

var axis_ge = d3.select('#axis')
    .append('svg')
    .attr('width', 1200)
    .attr('height', 30);
    // .attr("transform", "translate(0," + height/2 + ")");

function drawGene(index){
    $('#gene').empty();
    d3.select('.axis_ge').remove();
    d = data[index];
    c = colors[index];
    $('#gene').css('background-color', c);
    $('#g').html('GENE: ' + d['gene']);
    $('#t').html('TYPE: ' + d['type']);

    pa = d['pa'];
    start = Math.min(d['start'], d['end']);
    end = Math.max(d['start'], d['end']);
    for(i = 0; i < pa.length; i ++){
        coord = pa[i]['coord'];
        position = (coord - start) / (end - start) * 1200;
        $('#gene').append('<div class="pa" style="left:'+position+'"><div>');
    }

    var scale = d3.scaleLinear()
        .domain([d['start'], d['end']])
        .rangeRound([0, 1200]);

    var xaxis = d3.axisBottom(scale)
        .tickSize(10);

    axis_ge.append("g")
        .attr('class', 'axis_ge')
        .call(xaxis);
}

// var r = 0;
// d3.timer(function(){
//     d3.selectAll('path')
//         .attr('transform', 'rotate('+r+')');
//     r += 0.2;
// })