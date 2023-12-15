const world = new CANNON.World();
const G = 6.67259*(10**(-11)) // m^3 / s^2 kg = N m^2 / kg^2 : (N = m kg / s^2)
const N = 20;
const R_CONSTRAINT = 10;
world.gravity.set(0, 0, 0); // 重力の設定

const canvas1 = document.querySelector('#canvas1');
const renderer = new THREE.WebGLRenderer({
	canvas: canvas1
});
var short_side = Math.min(canvas1.clientHeight, canvas1.clientWidth);
renderer.setSize(short_side, short_side);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(90, 1, 0.1, 1000);
camera.position.z = 20;
const controls = new THREE.OrbitControls(camera, canvas1);
const pointLight = new THREE.PointLight( 0xffffff, 10, 100 );
pointLight.position.set( 10, 0, 0 );
pointLight.castShadow = true;
scene.add( pointLight );

const ambientLight = new THREE.AmbientLight( 0xffffff, 4 ); // soft white light
scene.add( ambientLight );

// Cannon.jsの剛体の作成
function init_particle(particle_type) {
    let x0, v0, m, c, sphereMaterial, sphereGeometry;
    if (particle_type == "random") {
        x0 = new CANNON.Vec3(2*(Math.random()-0.5)*7.5,
                              2*(Math.random()-0.5)*7.5,
                              2*(Math.random()-0.5)*7.5);
        v0 = new CANNON.Vec3(2*(Math.random()-0.5)*10,
                              2*(Math.random()-0.5)*10,
                              2*(Math.random()-0.5)*10);        
        m = 1e9;
        c = 0x002000;
        sphereGeometry = new THREE.SphereGeometry(0.3, 8, 8);
        sphereMaterial = new THREE.MeshStandardMaterial({ color: c });
    } else {
        x0 = new CANNON.Vec3(0, 0, 0);
        v0 = new CANNON.Vec3(0, 0, 0);
        m = 1e10;
        c = 0xf00000;
        sphereGeometry = new THREE.SphereGeometry(0.2, 8, 8);
        sphereMaterial = new THREE.MeshBasicMaterial({ color: c });
    }

    const particle = {};
    const sphereMesh = new THREE.Mesh(sphereGeometry, sphereMaterial);
    sphereMesh.castShadow = true;
    scene.add(sphereMesh);
    particle["mesh"] = sphereMesh;

    const sphereShape = new CANNON.Sphere(1);
    const sphereBody = new CANNON.Body({ mass: m, position: x0, velocity: v0, KINEMATIC: true, });
    sphereBody.addShape(sphereShape);
    world.addBody(sphereBody);
    particle["body"] = sphereBody;

    sphereMesh.position.copy(sphereBody.position);
    return particle;
}

function init_particles() {
    const particles = [];

    const originParticle = init_particle("fixed");
    particles.push(originParticle);
    for (let i = 1; i < N; i++) {
        const particle = init_particle("random");
        particles.push(particle);
    };
    return particles;
}

function bounce(body, origin_body, type) {
    if (type == "sphere") {
        const r_pos = origin_body.position.distanceTo(body.position);
        if (r_pos >= R_CONSTRAINT) {
            const norm = body.position.unit();
            const reflect_v = norm.scale(2*norm.dot(body.velocity))
            body.velocity.copy(body.velocity.vsub(reflect_v))
        }
    } else if (type == "cube") {
        if (Math.abs(body.position.x) >= R_CONSTRAINT) {
            body.velocity.x *= -1
        }
        if (Math.abs(body.position.y) >= R_CONSTRAINT) {
            body.velocity.y *= -1
        }
        if (Math.abs(body.position.z) >= R_CONSTRAINT) {
            body.velocity.z *= -1
        }
    }
}

function update_particles(particles) {
    for (let i = 1; i < N; i++) {
        var particle = particles[i];
        var sphereBody = particle["body"]

        var a = new CANNON.Vec3(0, 0, 0);
        for (let j = 0; j < N; j++) {
            if (i == j) { continue };
            const t_particle = particles[j];
            const r2 = sphereBody.position.distanceSquared(t_particle["body"].position);
            const unitVec = sphereBody.position.vsub(t_particle["body"].position).unit();
            const aScalar = -G * t_particle["body"].mass / r2;
            const aLocal = unitVec.scale(aScalar, unitVec);
            a.vadd(aLocal, a);
        }

        sphereBody.velocity.vadd(a, sphereBody.velocity);

        bounce(sphereBody, particles[0]["body"], "cube")

        particle["mesh"].position.copy(sphereBody.position);
    };
}

const particles = init_particles();
controls.update();

// アニメーションループ
function animate() {
    requestAnimationFrame(animate);

    // Cannon.jsのシミュレーションを更新
    world.step(1 / 600);

    // 球体の位置をCannon.jsの剛体の位置に合わせる
    update_particles(particles)
    controls.update();

    // レンダリング
    renderer.render(scene, camera);
}

function onWindowResize(){
    short_side = Math.min(canvas1.clientHeight, canvas1.clientWidth);
	renderer.setSize(short_side, short_side);
}