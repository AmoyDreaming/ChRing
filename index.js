// global variables
var width = 800,
    height = 800;
    geneWidth = 60;
    paWidth = 50;
    radius = Math.min(width, height) / 2;

var gdata = [];
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
        var glastEnd = 0;
        for(i = 0; i < docs.length; i ++){
            doc = docs[i];
            glastEnd = Math.max(doc['start'], doc['end']);
            // prepare data of gene
            if(doc['start'] - glastEnd > 1){
                gdata.push({'gene': 'intron', 'len': Math.max(doc['start'], doc['end']) - glastEnd, 'pa': []});
                pdata.push({'pos': glastEnd, 'len': Math.max(doc['start'], doc['end']) - glastEnd, 'type': 'none'})
                colorHash = new ColorHash();
                colors.push('#ffffff');
            }
            colorHash = new ColorHash();
            colors.push(colorHash.hex(doc['gene'].slice(3)));
            gdata.push({
                'gene': doc['gene'],
                'type': doc['type'],
                'len': Math.abs(doc['end']-doc['start']),
                'start': doc['start'],
                'end': doc['end'],
                'pa': doc['pa']
            });

            // prepare data of pa
            pa_raw = doc['pa'];
            pa = [];
            if(doc['pa'].length == 0){
                pdata.push({'pos': Math.min(doc['start'], doc['end']), 'len': Math.abs(doc['end']-doc['start']), 'type':'none'});
                continue;
            }
            for(j = 0; j < doc['pa'].length; j++){
                pa.push(doc['pa'][j]['coord']);
            }
            pa.sort(function(a,b){return a-b});
            plastEnd = Math.min(doc['start'], doc['end']);
            for(k = 0; k < pa.length; k++){
                pos = pa[k];
                if(pos-plastEnd != 0){
                    pdata.push({'pos': plastEnd, 'len': pos-plastEnd-1, 'type':'none'});
                }
                pdata.push({'pos': pos, 'len': 1, 'type':'pa'});
                plastEnd = pos+1;
            }
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
            .data(pie_ge(gdata))
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

        // create pa arc model
        var arc_pa = d3.arc()
            .outerRadius(radius - geneWidth)
            .innerRadius(radius - geneWidth - paWidth);

        // create pa pie model
        var pie_pa = d3.pie()
            .startAngle(-0.25 * Math.PI)
            .endAngle(1.74 * Math.PI)
            .sort(function(d){
                return d.pos;
            })
            .value(function(d){
                return d.len;
            })
            .padAngle(0);;

        // draw pa
        svg.selectAll('.chrpa')
            .data(pie_pa(pdata))
            .enter().append('path')
            .sort(function(a,b){return a-b})
            .attr('d', arc_pa)
            .style('fill', function(d){
                if(d.data.type == 'pa') return '#000000';
                else return '#ffffff';
            })
            .style('stroke', function(d){
                if(d.data.type == 'pa') return '#000000';
                else return '#ffffff';
            })
            .style('stroke-width', function(d){
                if(d.data.type == 'pa') return 0.5;
                else return 0;
            })
            .attr('class', 'pa')
            .attr('data', function(d){return d.data.pos;})
            .on('click', pover);

        db.close();
    });
});

function pover(){
    console.log(this.getAttribute('data'));
}

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

function drawGene(index){
    $('#gene').empty();
    d3.select('.axis_ge').remove();
    d = gdata[index];
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