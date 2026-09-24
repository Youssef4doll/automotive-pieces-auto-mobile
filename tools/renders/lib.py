"""Shared studio for the Automotive Pièces Auto renders.

Every part is lit the same way — a studio HDRI for reflections, a soft key
from the upper left, a rim from behind, a fill — and rendered on a
transparent background with a shadow catcher, so the cutouts sit on any
card colour the app uses.
"""
import math
import os

import bmesh
import bpy
from mathutils import Euler, Vector

HDRI = os.environ.get('HDRI', '/tmp/apa-hdri')


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.render.engine = 'CYCLES'
    scene.cycles.device = 'CPU'
    scene.cycles.samples = 96
    scene.cycles.use_denoising = True
    scene.cycles.max_bounces = 8
    scene.cycles.transparent_max_bounces = 8
    scene.render.film_transparent = True
    scene.view_settings.view_transform = 'AgX'
    scene.view_settings.look = 'AgX - Medium High Contrast'
    scene.render.image_settings.file_format = 'PNG'
    scene.render.image_settings.color_mode = 'RGBA'
    scene.render.image_settings.color_depth = '8'
    return scene


def world(name='studio', strength=1.0, rotation=0.0, visible=False, background=(0, 0, 0)):
    scene = bpy.context.scene
    w = bpy.data.worlds.new('World')
    scene.world = w
    w.use_nodes = True
    nt = w.node_tree
    nt.nodes.clear()
    out = nt.nodes.new('ShaderNodeOutputWorld')
    env = nt.nodes.new('ShaderNodeTexEnvironment')
    env.image = bpy.data.images.load(os.path.join(HDRI, f'{name}.exr'))
    coord = nt.nodes.new('ShaderNodeTexCoord')
    mapping = nt.nodes.new('ShaderNodeMapping')
    mapping.inputs['Rotation'].default_value = (0, 0, rotation)
    bg = nt.nodes.new('ShaderNodeBackground')
    bg.inputs['Strength'].default_value = strength
    nt.links.new(coord.outputs['Generated'], mapping.inputs['Vector'])
    nt.links.new(mapping.outputs['Vector'], env.inputs['Vector'])
    nt.links.new(env.outputs['Color'], bg.inputs['Color'])
    if visible:
        nt.links.new(bg.outputs['Background'], out.inputs['Surface'])
    else:
        # Lights the scene, but the camera sees a plain colour.
        light_path = nt.nodes.new('ShaderNodeLightPath')
        plain = nt.nodes.new('ShaderNodeBackground')
        plain.inputs['Color'].default_value = (*background, 1)
        mix = nt.nodes.new('ShaderNodeMixShader')
        nt.links.new(light_path.outputs['Is Camera Ray'], mix.inputs['Fac'])
        nt.links.new(bg.outputs['Background'], mix.inputs[1])
        nt.links.new(plain.outputs['Background'], mix.inputs[2])
        nt.links.new(mix.outputs['Shader'], out.inputs['Surface'])
    return w


def area_light(name, location, target=(0, 0, 0), energy=300, size=1.0, color=(1, 1, 1), shape='RECTANGLE', size_y=None):
    data = bpy.data.lights.new(name, 'AREA')
    data.energy = energy
    data.color = color
    data.shape = shape
    data.size = size
    if size_y is not None:
        data.size_y = size_y
    obj = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(obj)
    obj.location = location
    # lights shape the reflections, but the camera never sees the fixture
    obj.visible_camera = False
    look_at(obj, target)
    return obj


def studio_lights(scale=1.0, key=1.0, rim=1.0, fill=1.0):
    s = scale
    # Softboxes: long strips read as the crisp highlights a product
    # photographer puts on metal; the dark room around them gives the
    # contrast that makes steel look like steel rather than white plastic.
    area_light('Key', (-1.0 * s, -1.0 * s, 2.0 * s), energy=75 * key * s * s, size=0.9 * s, size_y=1.8 * s)
    area_light('Rim', (1.1 * s, 1.5 * s, 1.0 * s), energy=70 * rim * s * s, size=0.35 * s, size_y=1.4 * s)
    area_light('Fill', (1.7 * s, -1.3 * s, 0.5 * s), energy=12 * fill * s * s, size=1.2 * s)
    area_light('Top', (0.2 * s, 0.1 * s, 2.2 * s), energy=22 * s * s, size=0.8 * s, size_y=2.2 * s)


def look_at(obj, target):
    direction = Vector(target) - obj.location
    obj.rotation_euler = direction.to_track_quat('-Z', 'Y').to_euler()


def camera(location, target=(0, 0, 0), lens=70, ortho=None):
    data = bpy.data.cameras.new('Camera')
    data.lens = lens
    if ortho:
        data.type = 'ORTHO'
        data.ortho_scale = ortho
    cam = bpy.data.objects.new('Camera', data)
    bpy.context.collection.objects.link(cam)
    cam.location = location
    look_at(cam, target)
    bpy.context.scene.camera = cam
    return cam


def shadow_catcher(size=6, z=0.0):
    bpy.ops.mesh.primitive_plane_add(size=size, location=(0, 0, z))
    plane = bpy.context.active_object
    plane.name = 'ShadowCatcher'
    plane.is_shadow_catcher = True
    return plane


# ---------------------------------------------------------------- materials

def material(name, base=(0.5, 0.5, 0.5), metallic=0.0, roughness=0.5, coat=0.0, coat_roughness=0.05,
             transmission=0.0, ior=1.45, specular=0.5, emission=None, emission_strength=0.0, alpha=1.0,
             anisotropic=0.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    p = m.node_tree.nodes['Principled BSDF']
    p.inputs['Base Color'].default_value = (*base, 1)
    p.inputs['Metallic'].default_value = metallic
    p.inputs['Roughness'].default_value = roughness
    p.inputs['Coat Weight'].default_value = coat
    p.inputs['Coat Roughness'].default_value = coat_roughness
    p.inputs['Transmission Weight'].default_value = transmission
    p.inputs['IOR'].default_value = ior
    p.inputs['Specular IOR Level'].default_value = specular
    p.inputs['Anisotropic'].default_value = anisotropic
    p.inputs['Alpha'].default_value = alpha
    if emission is not None:
        p.inputs['Emission Color'].default_value = (*emission, 1)
        p.inputs['Emission Strength'].default_value = emission_strength
    return m


def add_bump(mat, kind='noise', scale=60.0, strength=0.15, distance=0.002, rings_axis=None, detail=6.0):
    """A surface texture through the normal: grain for cast iron, rings for a
    machined face, a fine noise for rubber and friction material."""
    nt = mat.node_tree
    p = nt.nodes['Principled BSDF']
    bump = nt.nodes.new('ShaderNodeBump')
    bump.inputs['Strength'].default_value = strength
    bump.inputs['Distance'].default_value = distance
    if kind == 'rings':
        tex = nt.nodes.new('ShaderNodeTexWave')
        tex.wave_type = 'RINGS'
        tex.inputs['Scale'].default_value = scale
        tex.inputs['Distortion'].default_value = 0.6
        tex.inputs['Detail'].default_value = 2.0
        coord = nt.nodes.new('ShaderNodeTexCoord')
        nt.links.new(coord.outputs['Object'], tex.inputs['Vector'])
        nt.links.new(tex.outputs['Fac'], bump.inputs['Height'])
    else:
        tex = nt.nodes.new('ShaderNodeTexNoise')
        tex.inputs['Scale'].default_value = scale
        tex.inputs['Detail'].default_value = detail
        coord = nt.nodes.new('ShaderNodeTexCoord')
        nt.links.new(coord.outputs['Object'], tex.inputs['Vector'])
        nt.links.new(tex.outputs['Fac'], bump.inputs['Height'])
    nt.links.new(bump.outputs['Normal'], p.inputs['Normal'])
    return mat


def roughness_variation(mat, low, high, scale=8.0):
    nt = mat.node_tree
    p = nt.nodes['Principled BSDF']
    noise = nt.nodes.new('ShaderNodeTexNoise')
    noise.inputs['Scale'].default_value = scale
    ramp = nt.nodes.new('ShaderNodeMapRange')
    ramp.inputs['To Min'].default_value = low
    ramp.inputs['To Max'].default_value = high
    coord = nt.nodes.new('ShaderNodeTexCoord')
    nt.links.new(coord.outputs['Object'], noise.inputs['Vector'])
    nt.links.new(noise.outputs['Fac'], ramp.inputs['Value'])
    nt.links.new(ramp.outputs['Result'], p.inputs['Roughness'])
    return mat


def image_material(name, path, roughness=0.5, metallic=0.0, coat=0.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    p = nt.nodes['Principled BSDF']
    tex = nt.nodes.new('ShaderNodeTexImage')
    tex.image = bpy.data.images.load(path)
    nt.links.new(tex.outputs['Color'], p.inputs['Base Color'])
    p.inputs['Roughness'].default_value = roughness
    p.inputs['Metallic'].default_value = metallic
    p.inputs['Coat Weight'].default_value = coat
    return m


MATS = {}


def mats():
    """The palette, built once per scene."""
    global MATS
    MATS = {
        'machined': add_bump(material('Machined', (0.5, 0.5, 0.52), 1.0, 0.28, anisotropic=0.35), 'rings', 180, 0.12, 0.0006),
        'cast': roughness_variation(add_bump(material('Cast iron', (0.22, 0.22, 0.23), 1.0, 0.55), 'noise', 400, 0.25, 0.0008), 0.45, 0.7),
        'zinc': roughness_variation(add_bump(material('Zinc', (0.55, 0.57, 0.6), 1.0, 0.35), 'noise', 300, 0.08, 0.0004), 0.28, 0.45),
        'steel': material('Steel', (0.7, 0.7, 0.72), 1.0, 0.18),
        'chrome': material('Chrome', (0.9, 0.9, 0.92), 1.0, 0.04),
        'ecoat': roughness_variation(add_bump(material('E-coat', (0.035, 0.036, 0.04), 0.4, 0.42, coat=0.3, coat_roughness=0.25), 'noise', 500, 0.1, 0.0004), 0.36, 0.5),
        'black_paint': material('Black paint', (0.012, 0.012, 0.014), 0.0, 0.32, coat=0.4, coat_roughness=0.2),
        'satin_black': material('Satin black', (0.02, 0.02, 0.022), 0.0, 0.55),
        'rubber': add_bump(material('Rubber', (0.018, 0.018, 0.02), 0.0, 0.78), 'noise', 900, 0.15, 0.0003),
        'friction': add_bump(material('Friction', (0.06, 0.058, 0.055), 0.0, 0.92), 'noise', 700, 0.5, 0.0008),
        'plastic_black': material('Plastic', (0.025, 0.025, 0.028), 0.0, 0.45),
        'ceramic': material('Ceramic', (0.92, 0.92, 0.9), 0.0, 0.18, coat=0.6, coat_roughness=0.05),
        'copper': material('Copper', (0.95, 0.55, 0.35), 1.0, 0.25),
        'brass': material('Brass', (0.9, 0.75, 0.42), 1.0, 0.28),
        'gold_paint': material('Gold paint', (0.95, 0.66, 0.02), 0.0, 0.25, coat=1.0, coat_roughness=0.08),
        'navy_paint': material('Navy paint', (0.02, 0.05, 0.16), 0.3, 0.3, coat=1.0, coat_roughness=0.04),
        'blue_paint': material('Blue paint', (0.02, 0.12, 0.45), 0.2, 0.32, coat=1.0, coat_roughness=0.05),
        'red_paint': material('Red paint', (0.55, 0.02, 0.02), 0.1, 0.3, coat=1.0, coat_roughness=0.06),
        'white_paint': material('White paint', (0.85, 0.86, 0.88), 0.0, 0.3, coat=1.0, coat_roughness=0.05),
        'glass': material('Glass', (1, 1, 1), 0.0, 0.0, transmission=1.0, ior=1.5),
        'aluminium': roughness_variation(material('Aluminium', (0.8, 0.81, 0.83), 1.0, 0.3), 0.25, 0.4),
        'paper': material('Filter paper', (0.86, 0.8, 0.62), 0.0, 0.85),
        'foam': material('Foam', (0.08, 0.08, 0.09), 0.0, 0.95),
    }
    return MATS


def assign(obj, mat):
    obj.data.materials.clear()
    obj.data.materials.append(mat)
    return obj


def smooth(obj, angle=35):
    for poly in obj.data.polygons:
        poly.use_smooth = True
    mod = obj.modifiers.new('Smooth', 'SMOOTH_BY_ANGLE') if hasattr(bpy.types, 'NodesModifier') and False else None
    try:
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.shade_smooth_by_angle(angle=math.radians(angle))
    except Exception:
        pass
    return obj


def bevel(obj, width=0.001, segments=2, limit='ANGLE'):
    mod = obj.modifiers.new('Bevel', 'BEVEL')
    mod.width = width
    mod.segments = segments
    mod.limit_method = limit
    mod.harden_normals = False
    return mod


def boolean(obj, cutter, op='DIFFERENCE', apply=True):
    mod = obj.modifiers.new('Bool', 'BOOLEAN')
    mod.operation = op
    mod.object = cutter
    mod.solver = 'EXACT'
    if apply:
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.modifier_apply(modifier=mod.name)
        bpy.data.objects.remove(cutter, do_unlink=True)
    return obj


def cylinder(r, depth, loc=(0, 0, 0), verts=96, rot=(0, 0, 0), name=None):
    bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=r, depth=depth, location=loc, rotation=rot)
    o = bpy.context.active_object
    if name:
        o.name = name
    return o


def cube(size, loc=(0, 0, 0), rot=(0, 0, 0), name=None):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc, rotation=rot)
    o = bpy.context.active_object
    o.scale = size
    bpy.ops.object.transform_apply(scale=True)
    if name:
        o.name = name
    return o


def join(objs, name):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.join()
    o = bpy.context.active_object
    o.name = name
    return o


def parent_all(objs, name='Group'):
    empty = bpy.data.objects.new(name, None)
    bpy.context.collection.objects.link(empty)
    for o in objs:
        o.parent = empty
    return empty


def mesh_from_profile(points, depth, name, closed=True):
    """Extrude a 2D outline (XY) upward by depth."""
    bm = bmesh.new()
    verts = [bm.verts.new((x, y, 0)) for x, y in points]
    face = bm.faces.new(verts)
    res = bmesh.ops.extrude_face_region(bm, geom=[face])
    moved = [e for e in res['geom'] if isinstance(e, bmesh.types.BMVert)]
    bmesh.ops.translate(bm, vec=(0, 0, depth), verts=moved)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    o = bpy.data.objects.new(name, me)
    bpy.context.collection.objects.link(o)
    return o


def lathe(profile, name, steps=128):
    """Revolve an (r, z) profile around Z — the way a turned part is made."""
    bm = bmesh.new()
    rings = []
    for i in range(steps):
        a = 2 * math.pi * i / steps
        ca, sa = math.cos(a), math.sin(a)
        rings.append([bm.verts.new((r * ca, r * sa, z)) for r, z in profile])
    for i in range(steps):
        a, b = rings[i], rings[(i + 1) % steps]
        for j in range(len(profile) - 1):
            try:
                bm.faces.new((a[j], b[j], b[j + 1], a[j + 1]))
            except ValueError:
                pass
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-6)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    o = bpy.data.objects.new(name, me)
    bpy.context.collection.objects.link(o)
    for poly in o.data.polygons:
        poly.use_smooth = True
    return o


def frame(objs, cam, margin=1.12):
    """Move the camera along its view axis until everything fits."""
    scene = bpy.context.scene
    bpy.context.view_layer.update()
    from bpy_extras.object_utils import world_to_camera_view
    pts = []
    for o in objs:
        if o.type != 'MESH':
            continue
        dg = bpy.context.evaluated_depsgraph_get()
        ev = o.evaluated_get(dg)
        for v in ev.bound_box:
            pts.append(o.matrix_world @ Vector(v))
    centre = sum(pts, Vector()) / len(pts)
    forward = (cam.matrix_world.to_quaternion() @ Vector((0, 0, -1))).normalized()
    for _ in range(40):
        bpy.context.view_layer.update()
        cs = [world_to_camera_view(scene, cam, p) for p in pts]
        xs = [c.x for c in cs]
        ys = [c.y for c in cs]
        span = max(max(xs) - min(xs), max(ys) - min(ys))
        mid = Vector(((max(xs) + min(xs)) / 2 - 0.5, (max(ys) + min(ys)) / 2 - 0.5))
        # recentre
        right = cam.matrix_world.to_quaternion() @ Vector((1, 0, 0))
        up = cam.matrix_world.to_quaternion() @ Vector((0, 1, 0))
        dist = (cam.location - centre).length
        width = 2 * dist * math.tan(cam.data.angle / 2)
        cam.location += right * mid.x * width + up * mid.y * width
        target = 1 / margin
        if abs(span - target) < 0.01:
            break
        cam.location += forward * dist * (1 - span / target) * 0.9
    return cam


def render(path, res=(900, 900), samples=None):
    scene = bpy.context.scene
    scene.render.resolution_x, scene.render.resolution_y = res
    scene.render.resolution_percentage = 100
    if samples:
        scene.cycles.samples = samples
    scene.render.filepath = path
    bpy.ops.render.render(write_still=True)
    return path
