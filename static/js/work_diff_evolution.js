var DiffEvolution = (function () {
    var scene;
    var canvas;
    var renderer;
    var camera;
    var controls;
    var nodes = [];
    var attentionTargetNode;
    var t = 0;
    var analyzeInterval = 12;
    var shiftAttentionTargetInterval = 18;
    var introspectInterval = 30;
    var completeInterval = 200;
    var rootColor = 0xffffff;
    var targetColor = 0xffff00;
    var notTargetColor = 0xcccccc;
    var completeColor = 0x44aa88;
    var edgeColor = 0x666666;
    function createNode(parent, position, level) {
        var geometry = new THREE.SphereGeometry(0.3, 16, 16);
        var material = new THREE.MeshBasicMaterial({ color: 0x44aa88 });
        var mesh = new THREE.Mesh(geometry, material);
        mesh.position.copy(position);
        scene.add(mesh);
        var node = {
            mesh: mesh,
            parent: parent,
            children: [],
            level: level,
            attentionTarget: false,
            completed: false,
            isRoot: parent === null,
            edges: []
        };
        node.mesh.material.color.set(notTargetColor);
        if (parent) {
            parent.children.push(node);
            var edge = createEdge(parent, node);
            node.edges.push(edge);
            parent.edges.push(edge);
        }
        return node;
    }
    function createEdge(startNode, endNode) {
        var material = new THREE.LineBasicMaterial({ color: edgeColor });
        var points = [
            startNode.mesh.position,
            endNode.mesh.position
        ];
        var geometry = new THREE.BufferGeometry().setFromPoints(points);
        var line = new THREE.Line(geometry, material);
        scene.add(line);
        return line;
    }
    function getNearNodes(node) {
        var near = [];
        if (node.parent)
            near.push(node.parent);
        near.push.apply(near, node.children);
        return near;
    }
    function shiftAttentionTarget() {
        var candidates = getNearNodes(attentionTargetNode);
        if (candidates.length > 0) {
            var next = candidates[Math.floor(Math.random() * candidates.length)];
            attentionTargetNode.mesh.material.color.set(notTargetColor);
            attentionTargetNode = next;
            attentionTargetNode.mesh.material.color.set(targetColor);
        }
    }
    function analyze(node) {
        var centerToNode = node.mesh.position.clone().normalize();
        var randomDir = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize();
        var dir = centerToNode.multiplyScalar(0.7).add(randomDir.multiplyScalar(0.3)).normalize();
        var currentDistance = node.mesh.position.length();
        var dist = 2 + currentDistance * 0.2;
        var pos = node.mesh.position.clone().add(dir.multiplyScalar(dist));
        var child = createNode(node, pos, node.level + 1);
        nodes.push(child);
    }
    function introspect(node) {
        if (node.parent) {
            attentionTargetNode = node.parent;
            attentionTargetNode.mesh.material.color.set(targetColor);
        }
    }
    function complete(node) {
        node.completed = true;
        node.mesh.material.color.set(completeColor);
        if (node.parent) {
            attentionTargetNode = node.parent;
            attentionTargetNode.mesh.material.color.set(targetColor);
        }
    }
    function init(id) {
        scene = new THREE.Scene();
        canvas = document.querySelector('#' + id);
        renderer = new THREE.WebGLRenderer({
            canvas: canvas,
            antialias: true
        });
        var short_side = Math.min(canvas.clientHeight, canvas.clientWidth);
        renderer.setSize(short_side, short_side);
        camera = new THREE.PerspectiveCamera(90, 1, 0.1, 1000);
        camera.position.z = 20;
        controls = new THREE.OrbitControls(camera, canvas);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.screenSpacePanning = false;
        controls.minDistance = 10;
        controls.maxDistance = 50;
        controls.maxPolarAngle = Math.PI;
        var root = createNode(null, new THREE.Vector3(0, 0, 0), 0);
        root.mesh.material.color.set(rootColor);
        nodes.push(root);
        attentionTargetNode = root;
        t = 0;
    }
    function animate() {
        requestAnimationFrame(animate);
        t += 1;
        if (t % analyzeInterval === 0 && !attentionTargetNode.completed) {
            analyze(attentionTargetNode);
        }
        if (t % introspectInterval === 0 && !attentionTargetNode.completed) {
            introspect(attentionTargetNode);
        }
        if (t % completeInterval === 0 && !attentionTargetNode.completed) {
            complete(attentionTargetNode);
        }
        if (t % shiftAttentionTargetInterval === 0) {
            shiftAttentionTarget();
        }
        controls.update();
        renderer.render(scene, camera);
    }
    function onWindowResize() {
        var short_side = Math.min(canvas.clientHeight, canvas.clientWidth);
        renderer.setSize(short_side, short_side);
    }
    return {
        init: init,
        animate: animate,
        onWindowResize: onWindowResize
    };
})();

// 初期化とイベントリスナーの設定
window.addEventListener('DOMContentLoaded', function () {
    DiffEvolution.init("de_canvas");
    DiffEvolution.animate();
});
window.addEventListener('resize', DiffEvolution.onWindowResize, false);
