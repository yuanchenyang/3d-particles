var scene, camera, renderer, particleSystem, pMaterial, sceneSources,
    particleCount = 2000,
    sources = [[new THREE.Vector3(100, 100, 100),
               new THREE.Vector3(-100, -100, -100),
               new THREE.Vector3(0,100,100)],
               [new THREE.Vector3( 0,  100,  150),
                new THREE.Vector3(-200, -150,  100),
                new THREE.Vector3(-250,  100, -140),
                new THREE.Vector3( 0, -100, -100)],
               [new THREE.Vector3(100, 100, 100),
                new THREE.Vector3(-100, -100, -100)]];
var params = {
    damping: 0.0005,
    source: 0,
    timestep: 0.01,
    GC : 5000000,
    threshold : 20
};


var gl;

$(function() {
    var s = parseInt(getURLParameter("source"));
    if (s && s >= 0 && s < sources.length) {
        params.source = s;
    }

    init();
    animate();
});

function getURLParameter(name) {
    return decodeURIComponent((new RegExp('[?|&]' + name + '=' + '([^&;]+?)(&|#|;|$)').exec(location.search)||[,""])[1].replace(/\+/g, '%20'))||null;
}



function getShader(gl, id) {
    var shaderScript = document.getElementById(id);
    if (!shaderScript) {
        return null;
    }

    var str = "";
    var k = shaderScript.firstChild;
    while (k) {
        if (k.nodeType == 3) {
            str += k.textContent;
        }
        k = k.nextSibling;
    }

    var shader;
    if (shaderScript.type == "x-shader/x-fragment") {
        shader = gl.createShader(gl.FRAGMENT_SHADER);
    } else if (shaderScript.type == "x-shader/x-vertex") {
        shader = gl.createShader(gl.VERTEX_SHADER);
    } else {
        return null;
    }

    gl.shaderSource(shader, str);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        alert(gl.getShaderInfoLog(shader));
        return null;
    }

    return shader;
}

// Sets up the scene.
function init() {

    if (!Detector.webgl) {
        window.location = "http://get.webgl.org";
    }

    // Create the scene and set the scene size.
    scene = new THREE.Scene();

    create_renderer();

    // Create a camera, zoom it out from the model a bit, and add it to the scene.
    camera = new THREE.PerspectiveCamera( 45, window.innerWidth / window.innerHeight, 1, 2000 );
    camera.position.set( 0, 200, 800 );
    scene.add(camera);

    // Create an event listener that resizes the renderer with the browser window.
    window.addEventListener('resize', function() {
        var WIDTH = window.innerWidth,
            HEIGHT = window.innerHeight;
        renderer.setSize(WIDTH, HEIGHT);
        camera.aspect = WIDTH / HEIGHT;
        camera.updateProjectionMatrix();
    });

    // Set the background color of the scene.
    renderer.setClearColorHex(0x000000, 1);

    // Lights

    scene.add( new THREE.AmbientLight( 0x444444 ) );

    // Add OrbitControls so that we can pan around with the mouse.
    controls = new THREE.OrbitControls(camera, renderer.domElement);

    // create the particle variables
    var particles = new THREE.Geometry();


    // now create the individual particles
    var gravityAttributes = {
        velocity: { type: 'v3', value: [] },
        pos: { type: 'v3', value: [] }
    };

    var startx = rs() * 200,
        starty = rs() * 200,
        startz = rs() * 200;

    for(var p = 0; p < particleCount; p++) {
        var spherical = [ Math.abs(rs() + rs() + rs() + rs()) * 50,
                          r() * 2 * Math.PI,
                          Math.acos(rs())];

        var radial = spherical_to_radial(spherical);
        var particle = new THREE.Vector3(startx + rs() * 10,
                                         starty + rs() * 10,
                                         startz + rs() * 10);

        gravityAttributes.velocity.value[p] = new THREE.Vector3(
                rs() * 10 ,
                rs() * 10 ,
                rs() * 10 );

        // add it to the geometry
        particles.vertices.push(particle);
    }

    pMaterial = new THREE.ShaderMaterial({
        uniforms: {},
        attributes: gravityAttributes,
        vertexShader: $('#gravityVertexShader').text(),
        fragmentShader: $('#gravityFragmentShader').text()
    });

    // create the particle system
    particleSystem = new THREE.ParticleSystem(
        particles,
        pMaterial);

    // add it to the scene
    scene.add(particleSystem);

    sources[params.source].forEach(function(source) {
        scene.add(new_sphere(source));
    });

    add_stats();

    var gui = new DAT.GUI({height : 4 * 32 - 1});
    gui.add(params, 'damping').min(0.0).max(0.01).step(0.00001);
    gui.add(params, 'threshold').min(0).max(50).step(1);
    gui.add(params, 'timestep').min(0.0005).max(0.05).step(0.0005);
    gui.add(params, 'GC').min(100000).max(10000000).step(100000);
}


function create_renderer() {
    // Create a renderer and add it to the DOM.
    var WIDTH = window.innerWidth,
        HEIGHT = window.innerHeight;
    renderer = new THREE.WebGLRenderer({antialias:true});
    renderer.setSize(WIDTH, HEIGHT);
    document.body.appendChild(renderer.domElement);
}


function new_sphere(position) {
    var sphere =  new THREE.Mesh(
        new THREE.SphereGeometry(
            5,
            16,
            16),
        new THREE.MeshLambertMaterial(
            {
                color: 0xffffff
            })
    );

    sphere.position = position;
    return sphere;
}

function r() {return Math.random();}
function rs() {return 2 * (Math.random() - 0.5);}

function add_stats() {
    var stats = new Stats();
    stats.setMode(0); // 0: fps, 1: ms

    // Align top-left
    stats.domElement.style.position = 'absolute';
    stats.domElement.style.left = '30px';
    stats.domElement.style.top = '30px';

    document.body.appendChild( stats.domElement );

    setInterval( function () {

        stats.begin();

        // your code goes here

        stats.end();

    }, 1000 / 60 );
}



function animate() {
    // Render the scene.
    controls.update();

    //particleSystem.rotation.y += 0.001;

    var p = particleCount;
    while(p--) {

        // get the particle
        var position = particleSystem.geometry.vertices[p];
        var velocity = pMaterial.attributes.velocity.value[p];
        runge_kutta(position, velocity);
    }
    particleSystem.geometry.verticesNeedUpdate = true;
    pMaterial.attributes.velocity.needsUpdate = true;

    renderer.render( scene, camera );
    requestAnimationFrame(animate);
}

function runge_kutta(position, velocity) {
    function addNew(a, b, h) {
        return a.clone().add(b.clone().multiplyScalar(h));
    }
    function combine(k1, k2, k3, k4) {
        var result = new THREE.Vector3(0,0,0);
        result.add(k2).add(k3).multiplyScalar(2);
        result.add(k1).add(k4).multiplyScalar(h / 6);
        return result;
    }
    var h = params.timestep;
    var k1v = total_force(position);
    var k1r = velocity.clone();
    var k2r = addNew(velocity, k1v, h / 2);
    var k2v = total_force(addNew(position, k1r, h / 2));
    var k3r = addNew(velocity, k2v, h / 2);
    var k3v = total_force(addNew(position, k2r, h / 2));
    var k4r = addNew(velocity, k3v, h);
    var k4v = total_force(addNew(position, k3r, h));
    position.add(combine(k1r, k2r, k3r, k4r));
    velocity.add(combine(k1v, k2v, k3v, k4v)).multiplyScalar(1-params.damping);
}

function total_force(position) {
    var force = new THREE.Vector3(0,0,0);
    var source = sources[params.source];
    for (var i=0; i < source.length; i++) {
        force.add(get_force(source[i], position));
    }
    return force;
}

function get_force(source, position) {
    var dr = position.clone();
    dr.sub(source);
    var length = dr.length();
    var tmp = params.GC / (length * length * length);
    if (tmp > params.threshold) {
        return new THREE.Vector3(0,0,0);
    }
    var force = dr.clone();
    force.multiplyScalar(-1 * tmp);
    return force;
}

function spherical_to_radial(vec) {
    var r     = vec[0],
        theta = vec[1],
        phi   = vec[2];
    return [r * Math.sin(phi) * Math.cos(theta),
            r * Math.sin(phi) * Math.sin(theta),
            r * Math.cos(phi)];
}
