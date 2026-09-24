"""The home screen's hero: a night close-up of a wheel, its drilled disc and a
gold caliper, under a navy flank. python hero.py [preview|final] [out]"""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy  # noqa: E402
import bmesh  # noqa: E402
from mathutils import Vector  # noqa: E402

import lib  # noqa: E402
import parts  # noqa: E402
from lib import assign, cylinder, lathe  # noqa: E402

mode = sys.argv[1] if len(sys.argv) > 1 else 'preview'
out = sys.argv[2] if len(sys.argv) > 2 else os.path.join(os.environ.get('OUT', '/tmp/apa-renders'), 'out', f'hero_{mode}.png')
portrait = 'wide' not in mode

scene = lib.reset()
scene.render.film_transparent = False
M = lib.mats()
lib.world('night', strength=0.05, visible=False, background=(0.004, 0.008, 0.02))

R_TYRE, R_RIM, W = 0.33, 0.215, 0.225


def tyre_material():
    m = bpy.data.materials.new('Tyre')
    m.use_nodes = True
    nt = m.node_tree
    p = nt.nodes['Principled BSDF']
    p.inputs['Base Color'].default_value = (0.006, 0.006, 0.007, 1)
    p.inputs['Roughness'].default_value = 0.82
    coord = nt.nodes.new('ShaderNodeTexCoord')
    sep = nt.nodes.new('ShaderNodeSeparateXYZ')
    nt.links.new(coord.outputs['Object'], sep.inputs['Vector'])
    # angle around the axle -> lateral sipes
    atan = nt.nodes.new('ShaderNodeMath')
    atan.operation = 'ARCTAN2'
    nt.links.new(sep.outputs['Y'], atan.inputs[0])
    nt.links.new(sep.outputs['X'], atan.inputs[1])
    mul = nt.nodes.new('ShaderNodeMath')
    mul.operation = 'MULTIPLY'
    mul.inputs[1].default_value = 38.0
    nt.links.new(atan.outputs['Value'], mul.inputs[0])
    sine = nt.nodes.new('ShaderNodeMath')
    sine.operation = 'SINE'
    nt.links.new(mul.outputs['Value'], sine.inputs[0])
    sipes = nt.nodes.new('ShaderNodeMath')
    sipes.operation = 'GREATER_THAN'
    sipes.inputs[1].default_value = 0.82
    nt.links.new(sine.outputs['Value'], sipes.inputs[0])
    # longitudinal grooves across the tread width (object Z is the axle)
    zmul = nt.nodes.new('ShaderNodeMath')
    zmul.operation = 'MULTIPLY'
    zmul.inputs[1].default_value = 34.0
    nt.links.new(sep.outputs['Z'], zmul.inputs[0])
    zs = nt.nodes.new('ShaderNodeMath')
    zs.operation = 'SINE'
    nt.links.new(zmul.outputs['Value'], zs.inputs[0])
    grooves = nt.nodes.new('ShaderNodeMath')
    grooves.operation = 'GREATER_THAN'
    grooves.inputs[1].default_value = 0.9
    nt.links.new(zs.outputs['Value'], grooves.inputs[0])
    both = nt.nodes.new('ShaderNodeMath')
    both.operation = 'MAXIMUM'
    nt.links.new(sipes.outputs['Value'], both.inputs[0])
    nt.links.new(grooves.outputs['Value'], both.inputs[1])
    # only on the tread: radius beyond 0.31
    vlen = nt.nodes.new('ShaderNodeVectorMath')
    vlen.operation = 'LENGTH'
    comb = nt.nodes.new('ShaderNodeCombineXYZ')
    nt.links.new(sep.outputs['X'], comb.inputs['X'])
    nt.links.new(sep.outputs['Y'], comb.inputs['Y'])
    nt.links.new(comb.outputs['Vector'], vlen.inputs[0])
    tread = nt.nodes.new('ShaderNodeMath')
    tread.operation = 'GREATER_THAN'
    tread.inputs[1].default_value = R_TYRE - 0.012
    nt.links.new(vlen.outputs['Value'], tread.inputs[0])
    mask = nt.nodes.new('ShaderNodeMath')
    mask.operation = 'MULTIPLY'
    nt.links.new(both.outputs['Value'], mask.inputs[0])
    nt.links.new(tread.outputs['Value'], mask.inputs[1])
    inv = nt.nodes.new('ShaderNodeMath')
    inv.operation = 'SUBTRACT'
    inv.inputs[0].default_value = 1.0
    nt.links.new(mask.outputs['Value'], inv.inputs[1])
    bump = nt.nodes.new('ShaderNodeBump')
    bump.inputs['Strength'].default_value = 0.9
    bump.inputs['Distance'].default_value = 0.004
    nt.links.new(inv.outputs['Value'], bump.inputs['Height'])
    fine = nt.nodes.new('ShaderNodeTexNoise')
    fine.inputs['Scale'].default_value = 600
    bump2 = nt.nodes.new('ShaderNodeBump')
    bump2.inputs['Strength'].default_value = 0.2
    bump2.inputs['Distance'].default_value = 0.0003
    nt.links.new(fine.outputs['Fac'], bump2.inputs['Height'])
    nt.links.new(bump.outputs['Normal'], bump2.inputs['Normal'])
    nt.links.new(bump2.outputs['Normal'], p.inputs['Normal'])
    return m


def tyre():
    h = W / 2
    prof = [(R_RIM - 0.005, -h + 0.012), (R_RIM + 0.012, -h - 0.006), (0.27, -h - 0.012), (0.305, -h - 0.008),
            (R_TYRE - 0.008, -h + 0.012), (R_TYRE, -h + 0.035), (R_TYRE, h - 0.035), (R_TYRE - 0.008, h - 0.012),
            (0.305, h + 0.008), (0.27, h + 0.012), (R_RIM + 0.012, h + 0.006), (R_RIM - 0.005, h - 0.012)]
    o = lathe(prof, 'Tyre', steps=256)
    assign(o, tyre_material())
    return o


def spoke_outline(a, r0, r1):
    """A Y-shaped twin spoke, opening toward the rim."""
    pts = []
    for (t, half) in [(r0, 0.018), (r0 + (r1 - r0) * 0.45, 0.02), (r1, 0.05)]:
        pass
    ca, sa = math.cos(a), math.sin(a)
    def P(r, off):
        return (r * ca - off * sa, r * sa + off * ca)
    return [P(r0, -0.024), P(r0 + 0.06, -0.03), P(r1 - 0.02, -0.07), P(r1 + 0.012, -0.075), P(r1 + 0.012, -0.03),
            P(r0 + 0.11, -0.012), P(r0 + 0.11, 0.012), P(r1 + 0.012, 0.03), P(r1 + 0.012, 0.075), P(r1 - 0.02, 0.07),
            P(r0 + 0.06, 0.03), P(r0, 0.024)]


def rim():
    h = W / 2
    barrel = lathe([(R_RIM - 0.02, -h + 0.01), (R_RIM, -h + 0.005), (R_RIM + 0.008, -h + 0.012), (R_RIM - 0.012, -h + 0.03),
                    (R_RIM - 0.012, h - 0.03), (R_RIM + 0.01, h - 0.012), (R_RIM + 0.004, h - 0.002), (R_RIM - 0.016, h - 0.004)], 'Barrel', steps=192)
    alloy = lib.material('Machined alloy', (0.7, 0.71, 0.73), 1.0, 0.14, anisotropic=0.5)
    lib.add_bump(alloy, 'rings', 900, 0.05, 0.0002)
    dark = lib.material('Gunmetal', (0.05, 0.055, 0.06), 0.8, 0.35, coat=0.6, coat_roughness=0.15)
    assign(barrel, dark)
    spokes = []
    for i in range(5):
        a = 2 * math.pi * i / 5 + 0.3
        s = lib.mesh_from_profile(spoke_outline(a, 0.06, R_RIM - 0.01), 0.03, 'Spoke')
        s.location.z = h - 0.05
        spokes.append(s)
    face = lib.join(spokes, 'Spokes')
    lib.bevel(face, 0.004, 3)
    assign(face, alloy)
    hub = lathe([(0.0, h - 0.02), (0.045, h - 0.02), (0.07, h - 0.035), (0.075, h - 0.06), (0.0, h - 0.06)], 'Hub', steps=128)
    assign(hub, alloy)
    cap = lathe([(0.0, h - 0.012), (0.03, h - 0.014), (0.034, h - 0.022), (0.0, h - 0.022)], 'Cap', steps=64)
    assign(cap, dark)
    nuts = []
    for i in range(5):
        a = 2 * math.pi * i / 5 + 0.3 + math.pi / 5
        n = parts.hex_prism(0.011, 0.018, loc=(0.052 * math.cos(a), 0.052 * math.sin(a), h - 0.018), name='Lug nut')
        assign(n, M['chrome'])
        nuts.append(n)
    return [barrel, face, hub, cap] + nuts


def caliper():
    a0, a1 = math.radians(-35), math.radians(35)
    body = lib.mesh_from_profile(parts.rounded_sector(0.112, 0.178, a0, a1), 0.075, 'Caliper')
    body.location.z = -0.0375
    b = body.modifiers.new('Round', 'BEVEL')
    b.width = 0.012
    b.segments = 5
    bpy.context.view_layer.objects.active = body
    bpy.ops.object.modifier_apply(modifier=b.name)
    # the slot the disc runs through
    # the disc runs through a slot that stops short of the outer bridge
    slot = lathe([(0.09, -0.016), (0.156, -0.016), (0.156, 0.016), (0.09, 0.016)], 'Slot', steps=128)
    lib.boolean(body, slot)
    assign(body, M['gold_paint'])
    for p in body.data.polygons:
        p.use_smooth = True
    return [body]


# the hero: a drilled disc on its hub, a gold caliper over it, standing on
# a dark wet floor
disc = parts.brake_disc(M)
cal = caliper()
for o in cal:
    o.rotation_euler.z = math.radians(62)
    o.location.z = 0.0
assembly = disc + cal
g = lib.parent_all(assembly, 'Brake')
g.rotation_euler = (math.radians(90), 0, math.radians(-25))
g.location = (0, 0, 0.152)
pads = []
for i, (x, y, rz, tilt) in enumerate([(0.17, -0.2, math.radians(-30), 70), (0.25, -0.1, math.radians(-20), 0)]):
    grp, objs = parts.brake_pad(M)
    grp.rotation_euler = (math.radians(tilt), 0, rz)
    grp.location = (x, y, 0.026 if tilt else 0.0)
    pads += objs

# wet asphalt
def cove(width=14.0, depth=4.0, radius=1.2, height=3.0, back=1.4):
    bm = bmesh.new()
    prof = [(-depth, 0.0)]
    steps = 24
    for i in range(steps + 1):
        a = -math.pi / 2 + (math.pi / 2) * i / steps
        prof.append((back - radius + radius * math.cos(a) + 0.0, radius + radius * math.sin(a)))
    prof.append((back, height))
    rows = []
    for x in (-width / 2, width / 2):
        rows.append([bm.verts.new((x, y, z)) for y, z in prof])
    for j in range(len(prof) - 1):
        bm.faces.new((rows[0][j], rows[1][j], rows[1][j + 1], rows[0][j + 1]))
    me = bpy.data.meshes.new('Cove')
    bm.to_mesh(me)
    bm.free()
    o = bpy.data.objects.new('Cove', me)
    bpy.context.collection.objects.link(o)
    for p in o.data.polygons:
        p.use_smooth = True
    return o


ground = cove()
asphalt = lib.material('Studio floor', (0.012, 0.018, 0.04), 0.0, 0.3)
nt = asphalt.node_tree
pb = nt.nodes['Principled BSDF']
noise = nt.nodes.new('ShaderNodeTexNoise')
noise.inputs['Scale'].default_value = 3.0
noise.inputs['Detail'].default_value = 8
rng = nt.nodes.new('ShaderNodeMapRange')
rng.inputs['From Min'].default_value = 0.42
rng.inputs['From Max'].default_value = 0.58
rng.inputs['To Min'].default_value = 0.12
rng.inputs['To Max'].default_value = 0.75
nt.links.new(noise.outputs['Fac'], rng.inputs['Value'])
nt.links.new(rng.outputs['Result'], pb.inputs['Roughness'])
grain = nt.nodes.new('ShaderNodeTexNoise')
grain.inputs['Scale'].default_value = 400
bump = nt.nodes.new('ShaderNodeBump')
bump.inputs['Strength'].default_value = 0.35
nt.links.new(grain.outputs['Fac'], bump.inputs['Height'])
nt.links.new(bump.outputs['Normal'], pb.inputs['Normal'])
assign(ground, asphalt)

# night lighting: a cold rim from behind, a warm street light far off, a
# soft key low on the wheel face, and a gold kicker that finds the caliper
lib.area_light('Rim cold', (-0.9, 0.9, 0.6), target=(0, 0, 0.15), energy=40, size=0.5, size_y=1.2, color=(0.55, 0.7, 1.0))
lib.area_light('Key', (0.9, -0.7, 0.9), target=(0, 0, 0.15), energy=16, size=0.25, size_y=1.0, color=(0.92, 0.95, 1.0))
lib.area_light('Top strip', (0.25, 0.0, 1.0), target=(0, 0, 0.15), energy=6, size=0.1, size_y=0.8, color=(0.8, 0.86, 1.0))
lib.area_light('Warm', (0.6, 0.9, 0.35), target=(0, 0, 0.15), energy=10, size=0.3, color=(1.0, 0.7, 0.38))
lib.area_light('Reflector', (1.1, -1.5, 0.55), target=(0, 0, 0.15), energy=14, size=1.4, size_y=0.8, color=(0.85, 0.9, 1.0))
lib.area_light('Face card', (-0.9, 0.05, 0.42), target=(0, 0, 0.16), energy=13, size=0.9, size_y=0.5, color=(0.88, 0.92, 1.0))
lib.area_light('Gold kick', (-0.3, -0.8, 0.5), target=(0, 0, 0.25), energy=5, size=0.2, color=(1.0, 0.85, 0.6))

if portrait:
    cam = lib.camera((0.7, -0.8, 0.24), target=(0.04, 0.0, 0.14), lens=33)
    res = (1170, 1560) if mode == 'final' else (585, 780)
else:
    cam = lib.camera((0.7, -0.8, 0.22), target=(0.0, 0.0, 0.13), lens=40)
    res = (1600, 900) if 'final' in mode else (800, 450)
# the headline sits top-left on the phone: push the brake down and right
cam.data.shift_x = -0.05 if portrait else -0.2
cam.data.shift_y = 0.07 if portrait else 0.02
cam.data.dof.use_dof = True
cam.data.dof.focus_object = g
cam.data.dof.aperture_fstop = 2.8
scene.render.film_transparent = False
lib.render(out, res=res, samples=96 if 'final' in mode else 48)
