"""The part models, one function per family. Metre scale, built at the
origin, Z up; each returns the list of objects that make it."""
import math
import os
import random

import bmesh
import bpy
from mathutils import Vector

import lib
from lib import assign, bevel, boolean, cube, cylinder, lathe, mesh_from_profile


def annular_sector(r_in, r_out, a0, a1, steps=40, ear=0.0):
    pts = []
    for i in range(steps + 1):
        a = a0 + (a1 - a0) * i / steps
        pts.append((r_out * math.cos(a), r_out * math.sin(a)))
    for i in range(steps + 1):
        a = a1 - (a1 - a0) * i / steps
        pts.append((r_in * math.cos(a), r_in * math.sin(a)))
    return pts


def rounded_sector(r_in, r_out, a0, a1, steps=48, corner=0.012):
    """An annular sector with rounded ends — the shape of a brake pad."""
    pts = []
    mid_r = (r_in + r_out) / 2
    half = (r_out - r_in) / 2
    # outer arc
    for i in range(steps + 1):
        a = a0 + (a1 - a0) * i / steps
        pts.append((r_out * math.cos(a), r_out * math.sin(a)))
    # end cap at a1 (semicircle)
    c = Vector((mid_r * math.cos(a1), mid_r * math.sin(a1)))
    for i in range(1, 12):
        t = math.pi * i / 12
        d = Vector((math.cos(a1), math.sin(a1))) * math.cos(t) * half + Vector((-math.sin(a1), math.cos(a1))) * math.sin(t) * half * 0.6
        pts.append(tuple(c + d))
    for i in range(steps + 1):
        a = a1 - (a1 - a0) * i / steps
        pts.append((r_in * math.cos(a), r_in * math.sin(a)))
    c = Vector((mid_r * math.cos(a0), mid_r * math.sin(a0)))
    for i in range(1, 12):
        t = math.pi * i / 12
        d = -Vector((math.cos(a0), math.sin(a0))) * math.cos(t) * half + Vector((math.sin(a0), -math.cos(a0))) * math.sin(t) * half * 0.6
        pts.append(tuple(c + d))
    return pts


# ------------------------------------------------------------------ brakes

def brake_disc(M, drilled=True):
    r_out, r_in, thick = 0.15, 0.092, 0.026
    ring = cylinder(r_out, thick, verts=192, name='Disc ring')
    boolean(ring, cylinder(r_in, thick * 2, verts=192))
    # the vent between the two friction plates, seen at the rim
    vent = cylinder(r_out + 0.01, 0.009, verts=192)
    boolean(vent, cylinder(r_in + 0.006, 0.02, verts=192))
    boolean(ring, vent)
    parts = [ring]
    # vanes
    vanes = []
    n = 36
    for i in range(n):
        a = 2 * math.pi * i / n
        v = cube((0.058, 0.0045, 0.0092), loc=((r_in + r_out) / 2 * math.cos(a), (r_in + r_out) / 2 * math.sin(a), 0), rot=(0, 0, a + 0.25))
        vanes.append(v)
    vane = lib.join(vanes, 'Vanes')
    assign(vane, M['ecoat'])
    if drilled:
        holes = []
        for ring_i, (rad, count, off) in enumerate([(0.108, 18, 0), (0.122, 18, 0.5), (0.136, 18, 0.25)]):
            for i in range(count):
                a = 2 * math.pi * (i + off) / count
                holes.append(cylinder(0.0034, 0.06, loc=(rad * math.cos(a), rad * math.sin(a), 0), verts=16))
        cutter = lib.join(holes, 'Holes')
        boolean(ring, cutter)
    assign(ring, M['machined'])
    bevel(ring, 0.0012, 2)
    # hat
    hat = lathe([(0.0, 0.058), (0.036, 0.058), (0.036, 0.061), (0.083, 0.061), (0.088, 0.056), (0.088, 0.013),
                 (0.094, 0.013), (0.094, 0.0), (0.083, 0.0), (0.082, 0.052), (0.036, 0.052), (0.0, 0.052)], 'Hat', steps=192)
    hat.location.z = thick / 2 - 0.013
    bpy.context.view_layer.objects.active = hat
    bpy.ops.object.transform_apply(location=True)
    # centre bore and five lug holes
    boolean(hat, cylinder(0.034, 0.2, verts=96))
    lugs = [cylinder(0.0075, 0.2, loc=(0.052 * math.cos(2 * math.pi * i / 5 + 0.3), 0.052 * math.sin(2 * math.pi * i / 5 + 0.3), 0), verts=32) for i in range(5)]
    boolean(hat, lib.join(lugs, 'Lugs'))
    assign(hat, M['ecoat'])
    bevel(hat, 0.0008, 2)
    return [ring, vane, hat]


def brake_pad(M, flip=False):
    a0, a1 = math.radians(60), math.radians(120)
    backing = mesh_from_profile(rounded_sector(0.094, 0.152, a0 - 0.08, a1 + 0.08), 0.0055, 'Backing plate')
    # the ears that sit in the caliper bracket
    for side in (-1, 1):
        a = math.radians(90) + side * 0.62
        ear = cube((0.03, 0.016, 0.0055), loc=(0.118 * math.cos(a), 0.118 * math.sin(a), 0.00275), rot=(0, 0, a + math.pi / 2))
        backing = lib.join([backing, ear], 'Backing plate')
    assign(backing, M['black_paint'])
    bevel(backing, 0.0008, 2)
    friction = mesh_from_profile(rounded_sector(0.1, 0.146, a0, a1), 0.012, 'Friction')
    friction.location.z = 0.0055
    # chamfers and the centre slot
    slot = cube((0.003, 0.06, 0.03), loc=(0, 0.123, 0.012))
    boolean(friction, slot)
    assign(friction, M['friction'])
    bevel(friction, 0.0015, 2)
    shim = mesh_from_profile(rounded_sector(0.098, 0.148, a0 + 0.02, a1 - 0.02), 0.0008, 'Shim')
    shim.location.z = -0.0008
    assign(shim, M['zinc'])
    objs = [backing, friction, shim]
    group = lib.parent_all(objs, 'Pad')
    group.location = (0, -0.123, 0)
    for o in objs:
        o.location.y += 0  # sector sits at y≈0.123; recentred by the parent
        o.location.y -= 0.123
    return group, objs


def freinage(M):
    disc = brake_disc(M)
    g = lib.parent_all(disc, 'Brake disc')
    g.rotation_euler = (math.radians(74), 0, math.radians(28))
    g.location = (0.02, 0.05, 0.155)
    pads = []
    for i, (x, y, rz) in enumerate([(-0.13, -0.07, math.radians(-24)), (-0.045, -0.11, math.radians(-10))]):
        grp, objs = brake_pad(M)
        grp.rotation_euler = (math.radians(74), 0, rz)
        grp.location = (x, y, 0.028)
        pads += objs
    return disc + pads


# ------------------------------------------------------------------ helpers

def helix(radius, pitch, turns, wire, name, flat_ends=True, steps_per_turn=48):
    curve = bpy.data.curves.new(name, 'CURVE')
    curve.dimensions = '3D'
    curve.bevel_depth = wire
    curve.bevel_resolution = 6
    spline = curve.splines.new('POLY')
    n = int(turns * steps_per_turn)
    spline.points.add(n)
    z = 0.0
    for i in range(n + 1):
        t = i / steps_per_turn
        a = 2 * math.pi * t
        # closed, ground ends: the pitch shrinks to one wire over the last turn
        frac = t / turns
        local = pitch
        if flat_ends and (t < 0.8 or t > turns - 0.8):
            local = wire * 2.1
        z += local / steps_per_turn
        spline.points[i].co = (radius * math.cos(a), radius * math.sin(a), z, 1)
    obj = bpy.data.objects.new(name, curve)
    bpy.context.collection.objects.link(obj)
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.convert(target='MESH')
    o = bpy.context.active_object
    for p in o.data.polygons:
        p.use_smooth = True
    return o, z


def tube_curve(points, radius, name, res=8):
    curve = bpy.data.curves.new(name, 'CURVE')
    curve.dimensions = '3D'
    curve.bevel_depth = radius
    curve.bevel_resolution = res
    spline = curve.splines.new('BEZIER')
    spline.bezier_points.add(len(points) - 1)
    for bp, co in zip(spline.bezier_points, points):
        bp.co = co
        bp.handle_left_type = bp.handle_right_type = 'AUTO'
    obj = bpy.data.objects.new(name, curve)
    bpy.context.collection.objects.link(obj)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True)
    bpy.ops.object.convert(target='MESH')
    o = bpy.context.active_object
    for p in o.data.polygons:
        p.use_smooth = True
    return o


def rounded_box(size, radius, loc=(0, 0, 0), name='Box', segments=4):
    o = cube(size, loc=loc, name=name)
    b = o.modifiers.new('Round', 'BEVEL')
    b.width = radius
    b.segments = segments
    b.limit_method = 'NONE'
    bpy.context.view_layer.objects.active = o
    bpy.ops.object.modifier_apply(modifier=b.name)
    for p in o.data.polygons:
        p.use_smooth = True
    return o


def hex_prism(r, depth, loc=(0, 0, 0), name='Hex'):
    o = cylinder(r, depth, loc=loc, verts=6, name=name)
    bevel(o, r * 0.06, 2)
    return o


def ring_grooves(profile_z_ranges, r, r_groove):
    """Helper to cut grooves into a lathe profile list."""
    return profile_z_ranges


# ------------------------------------------------------------------ filters

def oil_filter(M, paint):
    r = 0.039
    prof = [(0.0, 0.0), (0.03, 0.0), (0.036, 0.0015), (r, 0.006), (r, 0.094), (0.037, 0.1005), (0.03, 0.1045),
            (0.012, 0.106), (0.0, 0.106)]
    can = lathe(prof, 'Filter can', steps=160)
    assign(can, paint)
    # wrench flutes on the dome
    flutes = []
    for i in range(16):
        a = 2 * math.pi * i / 16
        flutes.append(cylinder(0.0028, 0.03, loc=(0.037 * math.cos(a), 0.037 * math.sin(a), 0.1), verts=12))
    boolean(can, lib.join(flutes, 'Flutes'))
    base = lathe([(0.0, 0.004), (0.012, 0.004), (0.012, -0.0015), (0.035, -0.0015), (0.036, 0.004), (0.036, 0.006), (0.0, 0.006)], 'Base plate', steps=128)
    assign(base, M['zinc'])
    # inlet holes
    holes = [cylinder(0.0035, 0.04, loc=(0.021 * math.cos(2 * math.pi * i / 8), 0.021 * math.sin(2 * math.pi * i / 8), 0), verts=16) for i in range(8)]
    boolean(base, lib.join(holes, 'Inlets'))
    gasket = lathe([(0.027, -0.004), (0.033, -0.004), (0.0335, -0.0015), (0.0335, 0.0), (0.027, 0.0), (0.0265, -0.002)], 'Gasket', steps=128)
    assign(gasket, M['rubber'])
    thread = lathe([(0.009, -0.008), (0.012, -0.008), (0.012, 0.004), (0.009, 0.004)], 'Thread', steps=64)
    assign(thread, M['steel'])
    objs = [can, base, gasket, thread]
    # stand it upright, base down
    for o in objs:
        o.rotation_euler.x = math.pi
        o.location.z = 0.106
    return objs


def air_filter(M, w=0.24, d=0.17, h=0.045, pleats=30):
    frame_o = rounded_box((w, d, h * 0.5), 0.006, loc=(0, 0, h * 0.25), name='Frame')
    boolean(frame_o, cube((w - 0.02, d - 0.02, h), loc=(0, 0, h * 0.25)))
    assign(frame_o, M['foam'])
    # pleated paper: a zig-zag strip
    bm = bmesh.new()
    xs = [(-w / 2 + 0.012) + i * (w - 0.024) / (pleats * 2) for i in range(pleats * 2 + 1)]
    top_z, bot_z = h * 0.95, h * 0.08
    rows = []
    for i, x in enumerate(xs):
        z = top_z if i % 2 else bot_z
        rows.append((bm.verts.new((x, -d / 2 + 0.011, z)), bm.verts.new((x, d / 2 - 0.011, z))))
    for i in range(len(rows) - 1):
        a, b = rows[i], rows[i + 1]
        bm.faces.new((a[0], b[0], b[1], a[1]))
    me = bpy.data.meshes.new('Pleats')
    bm.to_mesh(me)
    bm.free()
    pleat = bpy.data.objects.new('Pleats', me)
    bpy.context.collection.objects.link(pleat)
    sol = pleat.modifiers.new('Thick', 'SOLIDIFY')
    sol.thickness = 0.0012
    bevel(pleat, 0.0015, 3)
    assign(pleat, M['paper'])
    return [frame_o, pleat]


def filtres(M):
    oil = oil_filter(M, M['blue_paint'])
    g = lib.parent_all(oil, 'Oil')
    g.scale = (1.35, 1.35, 1.35)
    g.location = (0.05, -0.03, 0)
    air = air_filter(M)
    ga = lib.parent_all(air, 'Air')
    ga.location = (-0.07, 0.13, 0)
    ga.rotation_euler = (0, 0, math.radians(-18))
    return oil + air


# ------------------------------------------------------------------ suspension

def suspension(M):
    body = lathe([(0.0, 0.0), (0.02, 0.0), (0.024, 0.004), (0.024, 0.2), (0.021, 0.206), (0.0, 0.206)], 'Damper body', steps=96)
    assign(body, M['black_paint'])
    eye = cylinder(0.018, 0.03, loc=(0, 0, -0.008), rot=(0, math.pi / 2, 0), verts=48, name='Eye')
    boolean(eye, cylinder(0.009, 0.05, loc=(0, 0, -0.008), rot=(0, math.pi / 2, 0), verts=32))
    assign(eye, M['black_paint'])
    bush = lathe([(0.009, -0.013), (0.012, -0.013), (0.012, 0.013), (0.009, 0.013)], 'Bush', steps=48)
    bush.rotation_euler.y = math.pi / 2
    bush.location.z = -0.008
    assign(bush, M['rubber'])
    seat = lathe([(0.024, 0.06), (0.052, 0.06), (0.056, 0.064), (0.056, 0.068), (0.024, 0.068)], 'Lower seat', steps=128)
    assign(seat, M['zinc'])
    rod = cylinder(0.008, 0.16, loc=(0, 0, 0.28), verts=48, name='Rod')
    assign(rod, M['chrome'])
    spring, top = helix(0.045, 0.034, 6.2, 0.0065, 'Spring')
    spring.location.z = 0.068
    assign(spring, M['gold_paint'])
    zt = 0.068 + top
    upper = lathe([(0.008, zt), (0.054, zt), (0.058, zt + 0.004), (0.058, zt + 0.01), (0.03, zt + 0.016), (0.008, zt + 0.02)], 'Upper seat', steps=128)
    assign(upper, M['ecoat'])
    mount = lathe([(0.008, zt + 0.02), (0.036, zt + 0.02), (0.04, zt + 0.028), (0.04, zt + 0.04), (0.02, zt + 0.046), (0.008, zt + 0.046)], 'Top mount', steps=96)
    assign(mount, M['rubber'])
    nut = hex_prism(0.011, 0.012, loc=(0, 0, zt + 0.052), name='Nut')
    assign(nut, M['zinc'])
    boot = lathe([(0.0105, 0.206)] + [(0.013 + 0.003 * (i % 2), 0.21 + i * 0.006) for i in range(12)] + [(0.0085, 0.28)], 'Bellows', steps=64)
    assign(boot, M['rubber'])
    objs = [body, eye, bush, seat, rod, spring, upper, mount, nut, boot]
    g = lib.parent_all(objs, 'Strut')
    g.rotation_euler = (math.radians(-6), math.radians(52), math.radians(24))
    g.location = (0, 0, 0.06)
    return objs


# ------------------------------------------------------------------ ignition

def spark_plug(M):
    prof_metal = [(0.0, 0.0), (0.0065, 0.0), (0.007, 0.0015), (0.007, 0.019), (0.0072, 0.019)]
    # threads: a ridge every 1.25 mm
    thread = [(0.0, 0.0)]
    z = 0.002
    while z < 0.019:
        thread += [(0.0066, z), (0.0072, z + 0.0006)]
        z += 0.00125
    thread += [(0.0066, 0.019), (0.0078, 0.019), (0.0078, 0.0215), (0.0, 0.0215)]
    body = lathe(thread, 'Thread', steps=96)
    assign(body, M['zinc'])
    washer = lathe([(0.0075, 0.0195), (0.0105, 0.0195), (0.0105, 0.022), (0.0075, 0.022)], 'Washer', steps=96)
    assign(washer, M['copper'])
    hexa = hex_prism(0.0102, 0.012, loc=(0, 0, 0.029), name='Hex')
    assign(hexa, M['zinc'])
    shell = lathe([(0.0068, 0.022), (0.0085, 0.022), (0.0085, 0.036), (0.0072, 0.0375), (0.0068, 0.0375)], 'Crimp', steps=96)
    assign(shell, M['zinc'])
    ins = [(0.0, 0.035), (0.0068, 0.035)]
    z = 0.038
    for i in range(5):
        ins += [(0.0066, z), (0.0072, z + 0.002), (0.0072, z + 0.0035), (0.0066, z + 0.0055)]
        z += 0.0058
    ins += [(0.0055, z + 0.003), (0.0045, z + 0.004), (0.0, z + 0.004)]
    insulator = lathe(ins, 'Insulator', steps=96)
    assign(insulator, M['ceramic'])
    term = lathe([(0.0, z + 0.003), (0.0028, z + 0.003), (0.0028, z + 0.012), (0.0038, z + 0.013), (0.0038, z + 0.017), (0.0028, z + 0.019), (0.0, z + 0.019)], 'Terminal', steps=48)
    assign(term, M['steel'])
    tip = lathe([(0.0, -0.004), (0.0012, -0.004), (0.0012, 0.0), (0.0035, 0.0), (0.0, 0.0)], 'Centre electrode', steps=32)
    assign(tip, M['ceramic'])
    ground = tube_curve([(0.0066, 0, 0.0), (0.0066, 0, -0.004), (0.004, 0, -0.0065), (0.0, 0, -0.0068)], 0.0011, 'Ground electrode', res=2)
    assign(ground, M['steel'])
    return [body, washer, hexa, shell, insulator, term, tip, ground]


def allumage_prechauffage(M):
    objs = []
    for i, (x, y, rz, tilt) in enumerate([(-0.02, 0.0, 0.3, 78), (0.028, -0.02, -0.4, 90)]):
        p = spark_plug(M)
        g = lib.parent_all(p, f'Plug{i}')
        g.scale = (4, 4, 4)
        g.rotation_euler = (math.radians(tilt), 0, rz)
        g.location = (x * 4, y * 4, 0.04 if i == 0 else 0.041)
        objs += p
    return objs


# ------------------------------------------------------------------ lubricant

def lubrifiant(M):
    body = rounded_box((0.19, 0.11, 0.27), 0.022, loc=(0, 0, 0.135), name='Can')
    # the handle hole
    boolean(body, rounded_box((0.07, 0.2, 0.05), 0.02, loc=(0.035, 0, 0.225)))
    assign(body, M['plastic_black'])
    neck = lathe([(0.0, 0.0), (0.024, 0.0), (0.024, 0.018), (0.021, 0.02), (0.0, 0.02)], 'Neck', steps=64)
    neck.location = (-0.058, 0, 0.268)
    assign(neck, M['plastic_black'])
    cap = lathe([(0.0, 0.0), (0.027, 0.0), (0.027, 0.028), (0.024, 0.031), (0.0, 0.031)], 'Cap', steps=96)
    cap.location = (-0.058, 0, 0.282)
    ribs = [cube((0.0022, 0.004, 0.024), loc=(0.027 * math.cos(2 * math.pi * i / 40) - 0.058, 0.027 * math.sin(2 * math.pi * i / 40), 0.296), rot=(0, 0, 2 * math.pi * i / 40)) for i in range(40)]
    ribs_o = lib.join(ribs, 'Cap ribs')
    assign(cap, M['gold_paint'])
    assign(ribs_o, M['gold_paint'])
    label = rounded_box((0.004, 0.084, 0.13), 0.002, loc=(0, -0.055, 0.12), name='Label')
    label.rotation_euler.z = math.pi / 2
    label.location = (0.0, -0.0555, 0.12)
    assign(label, M['gold_paint'])
    stripe = rounded_box((0.004, 0.13, 0.012), 0.001, loc=(0, 0, 0), name='Stripe')
    stripe.rotation_euler.z = math.pi / 2
    stripe.location = (0.0, -0.0575, 0.155)
    assign(stripe, M['navy_paint'])
    return [body, neck, cap, ribs_o, label, stripe]


# ------------------------------------------------------------------ battery

def demarrage_electrique(M):
    case = rounded_box((0.26, 0.17, 0.17), 0.008, loc=(0, 0, 0.085), name='Case')
    assign(case, M['plastic_black'])
    lid = rounded_box((0.265, 0.175, 0.022), 0.006, loc=(0, 0, 0.18), name='Lid')
    assign(lid, M['plastic_black'])
    step = rounded_box((0.18, 0.12, 0.008), 0.003, loc=(0.02, 0.01, 0.194), name='Lid step')
    assign(step, M['plastic_black'])
    objs = [case, lid, step]
    for x, mat in [(-0.1, M['red_paint']), (0.1, M['plastic_black'])]:
        post = lathe([(0.0, 0.0), (0.009, 0.0), (0.0085, 0.018), (0.0, 0.018)], 'Post', steps=48)
        post.location = (x, -0.058, 0.19)
        assign(post, M['zinc'])
        cover = rounded_box((0.034, 0.034, 0.012), 0.004, loc=(x, -0.058, 0.196), name='Cover')
        assign(cover, mat)
        objs += [post, cover]
    handle = tube_curve([(-0.07, 0.07, 0.19), (-0.06, 0.07, 0.215), (0.06, 0.07, 0.215), (0.07, 0.07, 0.19)], 0.005, 'Handle')
    assign(handle, M['plastic_black'])
    label = rounded_box((0.2, 0.003, 0.09), 0.002, loc=(0, -0.0865, 0.085), name='Label')
    assign(label, M['navy_paint'])
    band = rounded_box((0.2, 0.0035, 0.018), 0.001, loc=(0, -0.087, 0.112), name='Band')
    assign(band, M['gold_paint'])
    return objs + [handle, label, band]


# ------------------------------------------------------------------ lighting

def eclairage(M):
    glass = lathe([(0.0, 0.0), (0.004, 0.0), (0.0055, 0.004), (0.0055, 0.028), (0.0048, 0.032), (0.0025, 0.0345), (0.0, 0.035)], 'Capsule', steps=96)
    assign(glass, M['glass'])
    cap_black = lathe([(0.0, 0.0345), (0.0026, 0.0345), (0.0022, 0.037), (0.0, 0.0375)], 'Cap', steps=48)
    assign(cap_black, M['plastic_black'])
    fil = helix(0.0012, 0.0006, 7, 0.00025, 'Filament', flat_ends=False, steps_per_turn=24)[0]
    fil.location.z = 0.012
    assign(fil, M['steel'])
    leads = [tube_curve([(0.0013 * s, 0, 0.0), (0.0013 * s, 0, 0.012)], 0.0003, 'Lead', res=2) for s in (-1, 1)]
    for l in leads:
        assign(l, M['steel'])
    base = lathe([(0.0, -0.012), (0.009, -0.012), (0.009, -0.008), (0.0065, -0.007), (0.0065, 0.0), (0.0, 0.0)], 'Base', steps=96)
    assign(base, M['zinc'])
    flange = cylinder(0.0125, 0.0012, loc=(0, 0, -0.0085), verts=96, name='Flange')
    for i in range(3):
        a = 2 * math.pi * i / 3
        boolean(flange, cube((0.006, 0.008, 0.01), loc=(0.0135 * math.cos(a), 0.0135 * math.sin(a), -0.0085), rot=(0, 0, a)))
    assign(flange, M['steel'])
    plug = rounded_box((0.012, 0.01, 0.014), 0.001, loc=(0, 0, -0.018), name='Plug')
    assign(plug, M['plastic_black'])
    objs = [glass, cap_black, fil, base, flange, plug] + leads
    g = lib.parent_all(objs, 'Bulb')
    g.scale = (7, 7, 7)
    g.rotation_euler = (math.radians(12), math.radians(-18), 0)
    g.location = (0, 0, 0.18)
    return objs


# ------------------------------------------------------------------ engine

def moteur(M):
    r = 0.04
    prof = [(0.0, 0.0), (0.038, 0.0), (0.0395, 0.004), (r, 0.004)]
    z = 0.006
    for gi in range(3):
        prof += [(r, z), (0.0375, z), (0.0375, z + 0.0025), (r, z + 0.0025)]
        z += 0.005
    prof += [(r, 0.03), (0.0395, 0.06), (0.03, 0.062), (0.0, 0.062)]
    piston = lathe(prof, 'Piston', steps=160)
    # pin bosses and skirt relief
    boolean(piston, cube((0.1, 0.05, 0.03), loc=(0, 0, 0.052)), op='DIFFERENCE')
    piston.rotation_euler.x = math.pi
    piston.location.z = 0.062
    pin = cylinder(0.011, 0.07, loc=(0, 0, 0.042), rot=(0, math.pi / 2, 0), verts=48, name='Pin')
    boolean(pin, cylinder(0.006, 0.09, loc=(0, 0, 0.042), rot=(0, math.pi / 2, 0), verts=32))
    assign(piston, M['aluminium'])
    assign(pin, M['steel'])
    # con rod: an I-beam from the pin down to the big end
    small = cylinder(0.017, 0.022, loc=(0, 0, 0.042), rot=(0, math.pi / 2, 0), verts=64, name='Small end')
    beam = cube((0.02, 0.014, 0.12), loc=(0, 0, -0.02), name='Beam')
    big = cylinder(0.035, 0.024, loc=(0, 0, -0.09), rot=(0, math.pi / 2, 0), verts=96, name='Big end')
    rod = lib.join([small, beam, big], 'Con rod')
    bpy.context.view_layer.objects.active = rod
    boolean(rod, cylinder(0.011, 0.05, loc=(0, 0, 0.042), rot=(0, math.pi / 2, 0), verts=48))
    boolean(rod, cylinder(0.024, 0.05, loc=(0, 0, -0.09), rot=(0, math.pi / 2, 0), verts=64))
    for s in (-1, 1):
        boolean(rod, cube((0.008, 0.02, 0.08), loc=(s * 0.011, 0, -0.018)))
    assign(rod, M['steel'])
    bevel(rod, 0.0012, 2)
    bolts = [cylinder(0.0045, 0.02, loc=(0, s * 0.03, -0.118), verts=6) for s in (-1, 1)]
    for b in bolts:
        assign(b, M['zinc'])
    rings = [lathe([(r - 0.0024, 0.0), (r + 0.0003, 0.0), (r + 0.0003, 0.002), (r - 0.0024, 0.002)], 'Ring', steps=128) for _ in range(3)]
    for i, rg in enumerate(rings):
        rg.location.z = 0.062 - 0.0065 - i * 0.005
        assign(rg, M['ecoat'])
    objs = [piston, pin, rod] + bolts + rings
    g = lib.parent_all(objs, 'Assembly')
    g.rotation_euler = (math.radians(0), math.radians(-12), math.radians(30))
    g.location = (0, 0, 0.14)
    return objs


# ------------------------------------------------------------------ driveshaft

def boot_profile(r0, r1, length, folds):
    pts = [(r0, 0.0)]
    for i in range(folds * 2):
        t = (i + 1) / (folds * 2 + 1)
        base = r0 + (r1 - r0) * t
        pts.append((base + (0.006 if i % 2 == 0 else -0.002), length * t))
    pts.append((r1, length))
    return pts


def cardan_et_transmission(M):
    shaft = cylinder(0.012, 0.36, loc=(0, 0, 0.18), verts=48, name='Shaft')
    assign(shaft, M['ecoat'])
    outer = lathe([(0.0, 0.0), (0.02, 0.0), (0.045, 0.02), (0.048, 0.05), (0.03, 0.07), (0.0, 0.07)], 'Outer joint', steps=128)
    outer.location.z = -0.07
    assign(outer, M['steel'])
    stub = cylinder(0.014, 0.06, loc=(0, 0, -0.1), verts=48, name='Stub')
    splines = [cube((0.003, 0.004, 0.035), loc=(0.0145 * math.cos(2 * math.pi * i / 24), 0.0145 * math.sin(2 * math.pi * i / 24), -0.09), rot=(0, 0, 2 * math.pi * i / 24)) for i in range(24)]
    stub = lib.join([stub] + splines, 'Stub')
    assign(stub, M['steel'])
    thread = cylinder(0.009, 0.03, loc=(0, 0, -0.14), verts=32, name='Thread')
    assign(thread, M['zinc'])
    boot1 = lathe(boot_profile(0.036, 0.014, 0.09, 5), 'Outer boot', steps=96)
    assign(boot1, M['rubber'])
    inner = lathe([(0.0, 0.0), (0.045, 0.0), (0.046, 0.05), (0.03, 0.06), (0.0, 0.06)], 'Tripod housing', steps=128)
    inner.location.z = 0.37
    assign(inner, M['steel'])
    boot2 = lathe(boot_profile(0.014, 0.038, 0.08, 4), 'Inner boot', steps=96)
    boot2.location.z = 0.29
    assign(boot2, M['rubber'])
    clamps = []
    for z, rr in [(0.004, 0.037), (0.088, 0.016), (0.292, 0.016), (0.368, 0.04)]:
        c = lathe([(rr - 0.001, 0), (rr + 0.0015, 0), (rr + 0.0015, 0.006), (rr - 0.001, 0.006)], 'Clamp', steps=96)
        c.location.z = z
        assign(c, M['zinc'])
        clamps.append(c)
    objs = [shaft, outer, stub, thread, boot1, inner, boot2] + clamps
    g = lib.parent_all(objs, 'Driveshaft')
    g.rotation_euler = (math.radians(90), 0, math.radians(-28))
    g.location = (0, 0, 0.05)
    return objs


# ------------------------------------------------------------------ fixes: engine, lubricant

def rod_outline(r_small, r_big, z_small, z_big, beam_top, beam_bottom, steps=40):
    pts = []
    # small end, top half-and-a-bit, left to right over the top
    for i in range(steps + 1):
        a = math.pi + math.radians(-25) - (math.pi + math.radians(-50)) * i / steps
        pts.append((r_small * math.cos(a), z_small + r_small * math.sin(a)))
    # right side of the beam down to the big end
    pts.append((beam_top, z_small - r_small * 0.7))
    pts.append((beam_bottom, z_big + r_big * 0.75))
    # big end, bottom half
    for i in range(steps + 1):
        a = math.radians(40) - (math.pi + math.radians(80)) * i / steps
        pts.append((r_big * math.cos(a), z_big + r_big * math.sin(a)))
    pts.append((-beam_bottom, z_big + r_big * 0.75))
    pts.append((-beam_top, z_small - r_small * 0.7))
    return pts


def moteur(M):
    r = 0.04
    crown_z = 0.13
    prof = [(0.0, crown_z), (0.036, crown_z), (0.0395, crown_z - 0.003), (r, crown_z - 0.004)]
    z = crown_z - 0.007
    for gi in range(3):
        prof += [(r, z), (0.0372, z), (0.0372, z - 0.0026), (r, z - 0.0026)]
        z -= 0.0055
    prof += [(r, crown_z - 0.03), (0.0396, crown_z - 0.062), (0.035, crown_z - 0.063), (0.035, crown_z - 0.0605),
             (0.0385, crown_z - 0.059), (0.038, crown_z - 0.012), (0.0, crown_z - 0.012)]
    piston = lathe(prof, 'Piston', steps=160)
    pin_z = crown_z - 0.036
    # skirt relief either side of the pin
    for s in (-1, 1):
        boolean(piston, cube((0.02, 0.1, 0.05), loc=(s * 0.047, 0, pin_z - 0.015)))
    assign(piston, M['aluminium'])
    pin = cylinder(0.0105, 0.074, loc=(0, 0, pin_z), rot=(0, math.pi / 2, 0), verts=48, name='Pin')
    boolean(pin, cylinder(0.0062, 0.09, loc=(0, 0, pin_z), rot=(0, math.pi / 2, 0), verts=32))
    assign(pin, M['steel'])
    z_big = pin_z - 0.14
    outline = rod_outline(0.016, 0.034, pin_z, z_big, 0.0085, 0.014)
    rod = mesh_from_profile([(x, zz) for x, zz in outline], 0.02, 'Con rod')
    # the outline was drawn in XY; stand it up into XZ and centre its thickness on Y=0
    rod.rotation_euler.x = math.pi / 2
    rod.location.y = 0.01
    bpy.context.view_layer.objects.active = rod
    bpy.ops.object.transform_apply(location=True, rotation=True)
    boolean(rod, cylinder(0.0108, 0.06, loc=(0, 0, pin_z), rot=(math.pi / 2, 0, 0), verts=48))
    boolean(rod, cylinder(0.0235, 0.06, loc=(0, 0, z_big), rot=(math.pi / 2, 0, 0), verts=64))
    # the I-beam's recess on each face
    for s in (-1, 1):
        rec = mesh_from_profile([(-0.005, pin_z - 0.028), (0.005, pin_z - 0.028), (0.008, z_big + 0.04), (-0.008, z_big + 0.04)], 0.012, 'Recess')
        rec.rotation_euler.x = math.pi / 2
        rec.location.y = s * 0.0135 + 0.006
        bpy.context.view_layer.objects.active = rec
        bpy.ops.object.transform_apply(location=True, rotation=True)
        boolean(rod, rec)
    assign(rod, M['steel'])
    bevel(rod, 0.0012, 2)
    # the cap line and its two bolts
    bolts = []
    for s in (-1, 1):
        b = cylinder(0.0048, 0.024, loc=(s * 0.027, 0, z_big - 0.005), verts=6, name='Bolt')
        assign(b, M['zinc'])
        bolts.append(b)
    rings = []
    for i in range(3):
        rg = lathe([(r - 0.0025, 0.0), (r + 0.0002, 0.0), (r + 0.0002, 0.0022), (r - 0.0025, 0.0022)], 'Ring', steps=128)
        rg.location.z = crown_z - 0.0092 - i * 0.0055
        assign(rg, M['ecoat'] if i < 2 else M['steel'])
        rings.append(rg)
    objs = [piston, pin, rod] + bolts + rings
    g = lib.parent_all(objs, 'Assembly')
    g.rotation_euler = (math.radians(-8), math.radians(-10), math.radians(-38))
    g.location = (0, 0, 0.1)
    return objs


def lubrifiant(M):
    body = rounded_box((0.2, 0.1, 0.24), 0.02, loc=(0, 0, 0.12), name='Jug')
    assign(body, M['plastic_black'])
    shoulder = rounded_box((0.2, 0.1, 0.03), 0.02, loc=(0, 0, 0.245), name='Shoulder')
    assign(shoulder, M['plastic_black'])
    neck = lathe([(0.0, 0.0), (0.022, 0.0), (0.022, 0.016), (0.0, 0.016)], 'Neck', steps=64)
    neck.location = (-0.06, 0, 0.255)
    assign(neck, M['plastic_black'])
    cap = lathe([(0.0, 0.0), (0.026, 0.0), (0.026, 0.026), (0.023, 0.029), (0.0, 0.029)], 'Cap', steps=96)
    cap.location = (-0.06, 0, 0.268)
    assign(cap, M['gold_paint'])
    ribs = [cube((0.002, 0.0035, 0.022), loc=(0.026 * math.cos(2 * math.pi * i / 44) - 0.06, 0.026 * math.sin(2 * math.pi * i / 44), 0.281), rot=(0, 0, 2 * math.pi * i / 44)) for i in range(44)]
    ribs_o = lib.join(ribs, 'Cap ribs')
    assign(ribs_o, M['gold_paint'])
    handle = tube_curve([(0.005, 0.0, 0.258), (0.02, 0.0, 0.3), (0.075, 0.0, 0.3), (0.088, 0.0, 0.258)], 0.011, 'Handle')
    assign(handle, M['plastic_black'])
    label = rounded_box((0.15, 0.004, 0.14), 0.003, loc=(0.0, -0.0505, 0.115), name='Label')
    assign(label, M['gold_paint'])
    band = rounded_box((0.15, 0.0046, 0.03), 0.002, loc=(0.0, -0.051, 0.155), name='Band')
    assign(band, M['navy_paint'])
    window = rounded_box((0.014, 0.004, 0.16), 0.002, loc=(0.088, -0.0505, 0.12), name='Level window')
    assign(window, material_smoke())
    return [body, shoulder, neck, cap, ribs_o, handle, label, band, window]


def material_smoke():
    return lib.material('Smoke', (0.25, 0.2, 0.08), 0.0, 0.1, transmission=0.6)


# ------------------------------------------------------------------ clutch

def embrayage(M):
    # pressure plate cover: a stamped dish with the diaphragm fingers in the middle
    cover = lathe([(0.075, 0.0), (0.118, 0.0), (0.12, 0.004), (0.113, 0.006), (0.106, 0.008), (0.104, 0.034),
                   (0.098, 0.04), (0.07, 0.042), (0.066, 0.038), (0.0, 0.038)], 'Cover', steps=192)
    boolean(cover, cylinder(0.075, 0.2, verts=128))
    windows = [cube((0.03, 0.03, 0.03), loc=(0.103 * math.cos(2 * math.pi * i / 3 + 0.5), 0.103 * math.sin(2 * math.pi * i / 3 + 0.5), 0.022), rot=(0, 0, 2 * math.pi * i / 3 + 0.5)) for i in range(3)]
    boolean(cover, lib.join(windows, 'Windows'))
    holes = [cylinder(0.0045, 0.05, loc=(0.113 * math.cos(2 * math.pi * i / 6), 0.113 * math.sin(2 * math.pi * i / 6), 0), verts=16) for i in range(6)]
    boolean(cover, lib.join(holes, 'Bolt holes'))
    assign(cover, M['zinc'])
    bevel(cover, 0.0008, 2)
    diaphragm = lathe([(0.02, 0.03), (0.075, 0.041), (0.075, 0.043), (0.02, 0.032)], 'Diaphragm', steps=192)
    slots = [cube((0.052, 0.0035, 0.05), loc=(0.047 * math.cos(2 * math.pi * i / 18), 0.047 * math.sin(2 * math.pi * i / 18), 0.035), rot=(0, 0, 2 * math.pi * i / 18)) for i in range(18)]
    boolean(diaphragm, lib.join(slots, 'Slots'))
    assign(diaphragm, M['steel'])
    cover_objs = [cover, diaphragm]
    g1 = lib.parent_all(cover_objs, 'Pressure plate')
    g1.rotation_euler = (math.radians(70), 0, math.radians(20))
    g1.location = (0.07, 0.07, 0.12)
    # friction disc
    lining = lathe([(0.072, 0.0), (0.11, 0.0), (0.11, 0.0035), (0.072, 0.0035)], 'Lining', steps=192)
    grooves = [cube((0.05, 0.002, 0.004), loc=(0.091 * math.cos(2 * math.pi * i / 12), 0.091 * math.sin(2 * math.pi * i / 12), 0.0035), rot=(0, 0, 2 * math.pi * i / 12)) for i in range(12)]
    boolean(lining, lib.join(grooves, 'Grooves'))
    lining_mat = lib.add_bump(lib.material('Clutch lining', (0.2, 0.17, 0.14), 0.0, 0.9), 'noise', 500, 0.35, 0.0006)
    assign(lining, lining_mat)
    rivets_plate = cylinder(0.074, 0.0015, loc=(0, 0, -0.001), verts=128, name='Segment plate')
    assign(rivets_plate, M['steel'])
    hub = lathe([(0.012, -0.012), (0.03, -0.012), (0.03, 0.0), (0.05, 0.0), (0.05, 0.004), (0.03, 0.004), (0.03, 0.016), (0.012, 0.016)], 'Hub', steps=128)
    assign(hub, M['ecoat'])
    springs = []
    for i in range(4):
        a = 2 * math.pi * i / 4 + 0.4
        sp, _ = helix(0.0065, 0.004, 5, 0.0012, 'Damper spring', flat_ends=False, steps_per_turn=20)
        sp.rotation_euler = (0, math.pi / 2, a + math.pi / 2)
        sp.location = (0.042 * math.cos(a) - 0.01 * math.sin(a), 0.042 * math.sin(a) + 0.01 * math.cos(a), 0.002)
        assign(sp, M['steel'])
        springs.append(sp)
    disc_objs = [lining, rivets_plate, hub] + springs
    g2 = lib.parent_all(disc_objs, 'Friction disc')
    g2.rotation_euler = (math.radians(68), 0, math.radians(-12))
    g2.location = (-0.09, -0.07, 0.112)
    return cover_objs + disc_objs


# ------------------------------------------------------------------ timing belt kit

def stadium(r, half_len, steps=64):
    pts = []
    for i in range(steps + 1):
        a = -math.pi / 2 + math.pi * i / steps
        pts.append((half_len + r * math.cos(a), r * math.sin(a)))
    for i in range(steps + 1):
        a = math.pi / 2 + math.pi * i / steps
        pts.append((-half_len + r * math.cos(a), r * math.sin(a)))
    return pts


def courroie_tendeur_et_chaine(M):
    w = 0.028
    outer = mesh_from_profile(stadium(0.075, 0.1), w, 'Belt')
    inner = mesh_from_profile(stadium(0.071, 0.1), w * 3, 'Inner')
    inner.location.z = -w
    boolean(outer, inner)
    belt = outer
    # teeth on the inside
    teeth = []
    n = 70
    per = []
    # walk the inner stadium and drop a tooth every few millimetres
    path = stadium(0.071, 0.1, steps=200)
    lengths = [0]
    for i in range(1, len(path)):
        lengths.append(lengths[-1] + math.dist(path[i], path[i - 1]))
    total = lengths[-1]
    for k in range(n):
        target = total * k / n
        j = next(i for i, L in enumerate(lengths) if L >= target)
        x, y = path[j]
        px, py = path[j - 1] if j > 0 else path[j + 1]
        ang = math.atan2(y - py, x - px)
        teeth.append(cube((0.0035, 0.004, w), loc=(x - 0.0018 * math.sin(ang) * -1, y - 0.0018 * math.cos(ang), w / 2), rot=(0, 0, ang)))
    belt = lib.join([belt] + teeth, 'Belt')
    assign(belt, M['rubber'])
    objs = [belt]
    # two toothed pulleys inside the loop, and the tensioner
    for x in (-0.1, 0.1):
        p = cylinder(0.066, 0.03, loc=(x, 0, w / 2), verts=96, name='Pulley')
        boolean(p, cylinder(0.05, 0.02, loc=(x, 0, w + 0.004), verts=96))
        boolean(p, cylinder(0.012, 0.1, loc=(x, 0, 0), verts=48))
        assign(p, M['zinc'])
        bevel(p, 0.001, 2)
        objs.append(p)
    tens = lathe([(0.008, -0.004), (0.028, -0.004), (0.03, 0.0), (0.03, 0.024), (0.028, 0.028), (0.008, 0.028)], 'Tensioner roller', steps=128)
    tens.location = (0.0, -0.108, 0.0)
    assign(tens, M['steel'])
    face = cylinder(0.02, 0.003, loc=(0.0, -0.108, 0.029), verts=64, name='Seal')
    assign(face, M['ecoat'])
    arm = rounded_box((0.07, 0.03, 0.006), 0.004, loc=(0.03, -0.12, -0.002), name='Arm')
    assign(arm, M['zinc'])
    objs += [tens, face, arm]
    g = lib.parent_all(objs, 'Kit')
    g.rotation_euler = (math.radians(62), 0, math.radians(18))
    g.location = (0, 0, 0.1)
    return objs


# ------------------------------------------------------------------ sensors

def capteurs_et_sondes(M):
    hexa = hex_prism(0.011, 0.012, loc=(0, 0, 0.0), name='Hex')
    assign(hexa, M['zinc'])
    thread = [(0.0, -0.006)]
    z = -0.006
    while z > -0.02:
        thread += [(0.0085, z), (0.009, z - 0.0005)]
        z -= 0.001
    thread += [(0.0085, -0.02), (0.0, -0.02)]
    th = lathe(thread, 'Thread', steps=96)
    assign(th, M['zinc'])
    probe = lathe([(0.0, -0.02), (0.0065, -0.02), (0.0065, -0.042), (0.0055, -0.045), (0.0, -0.046)], 'Probe', steps=96)
    slots = [cube((0.003, 0.02, 0.008), loc=(0.0065 * math.cos(2 * math.pi * i / 6), 0.0065 * math.sin(2 * math.pi * i / 6), -0.032), rot=(0, 0, 2 * math.pi * i / 6)) for i in range(6)]
    boolean(probe, lib.join(slots, 'Slots'))
    assign(probe, M['steel'])
    top = lathe([(0.0, 0.006), (0.009, 0.006), (0.009, 0.02), (0.006, 0.026), (0.004, 0.034), (0.0, 0.034)], 'Top', steps=64)
    assign(top, M['steel'])
    cable = tube_curve([(0, 0, 0.034), (0, 0, 0.07), (0.03, 0.02, 0.11), (0.1, 0.05, 0.1), (0.16, 0.02, 0.05), (0.2, -0.04, 0.03), (0.23, -0.09, 0.03)], 0.0032, 'Cable')
    assign(cable, M['rubber'])
    grommet = lathe([(0.0, 0.03), (0.005, 0.03), (0.005, 0.045), (0.0, 0.045)], 'Grommet', steps=48)
    assign(grommet, M['rubber'])
    plug = rounded_box((0.03, 0.022, 0.018), 0.003, loc=(0.245, -0.11, 0.03), name='Connector')
    plug.rotation_euler.z = math.radians(-55)
    assign(plug, M['plastic_black'])
    latch = rounded_box((0.012, 0.01, 0.006), 0.002, loc=(0.245, -0.11, 0.041), name='Latch')
    latch.rotation_euler.z = math.radians(-55)
    assign(latch, M['gold_paint'])
    sensor = [hexa, th, probe, top, grommet]
    g = lib.parent_all(sensor, 'Sensor head')
    g.scale = (2.2, 2.2, 2.2)
    g.rotation_euler = (math.radians(-20), math.radians(30), 0)
    g.location = (0, 0, 0.1)
    cable.location = (0, 0, 0)
    cable.scale = (1, 1, 1)
    return sensor + [cable, plug, latch]


def capteurs_et_sondes(M):
    s = 2.4
    hexa = hex_prism(0.011, 0.012, loc=(0, 0, 0.0), name='Hex')
    assign(hexa, M['zinc'])
    thread = [(0.0, -0.006)]
    z = -0.006
    while z > -0.02:
        thread += [(0.0085, z), (0.009, z - 0.0005)]
        z -= 0.001
    thread += [(0.0085, -0.02), (0.0, -0.02)]
    th = lathe(thread, 'Thread', steps=96)
    assign(th, M['zinc'])
    probe = lathe([(0.0, -0.02), (0.0065, -0.02), (0.0065, -0.042), (0.0055, -0.045), (0.0, -0.046)], 'Probe', steps=96)
    slots = [cube((0.003, 0.02, 0.008), loc=(0.0065 * math.cos(2 * math.pi * i / 6), 0.0065 * math.sin(2 * math.pi * i / 6), -0.032), rot=(0, 0, 2 * math.pi * i / 6)) for i in range(6)]
    boolean(probe, lib.join(slots, 'Slots'))
    assign(probe, M['steel'])
    top = lathe([(0.0, 0.006), (0.009, 0.006), (0.009, 0.02), (0.006, 0.026), (0.0045, 0.034), (0.0, 0.034)], 'Top', steps=64)
    assign(top, M['steel'])
    grommet = lathe([(0.0, 0.03), (0.005, 0.03), (0.005, 0.046), (0.0, 0.046)], 'Grommet', steps=48)
    assign(grommet, M['rubber'])
    cable = tube_curve([(0, 0, 0.044), (0, 0, 0.06), (0.01, 0.008, 0.075), (0.035, 0.02, 0.078), (0.06, 0.012, 0.06), (0.07, -0.01, 0.04), (0.075, -0.03, 0.03)], 0.0016, 'Cable')
    assign(cable, M['rubber'])
    plug = rounded_box((0.016, 0.011, 0.01), 0.0016, loc=(0.078, -0.04, 0.028), name='Connector')
    assign(plug, M['plastic_black'])
    latch = rounded_box((0.006, 0.005, 0.003), 0.001, loc=(0.078, -0.04, 0.0345), name='Latch')
    assign(latch, M['gold_paint'])
    objs = [hexa, th, probe, top, grommet, cable, plug, latch]
    g = lib.parent_all(objs, 'Sensor')
    g.scale = (s, s, s)
    g.rotation_euler = (math.radians(-38), math.radians(20), math.radians(10))
    g.location = (0, 0, 0.13)
    return objs


# ------------------------------------------------------------------ body: wing mirror

def carosserie(M):
    housing = rounded_box((0.2, 0.09, 0.12), 0.035, loc=(0, 0, 0.12), name='Housing', segments=8)
    sub = housing.modifiers.new('Sub', 'SUBSURF')
    sub.levels = 2
    sub.render_levels = 2
    # the glass sits in a shallow recess on the rear face
    recess = rounded_box((0.17, 0.05, 0.095), 0.03, loc=(0, -0.055, 0.12), segments=6)
    boolean(housing, recess, apply=False)
    recess.hide_render = True
    recess.hide_viewport = True
    assign(housing, M['navy_paint'])
    glass = rounded_box((0.168, 0.004, 0.092), 0.028, loc=(0, -0.034, 0.12), name='Mirror glass', segments=6)
    assign(glass, lib.material('Mirror', (0.3, 0.32, 0.36), 1.0, 0.02))
    cap_ring = rounded_box((0.176, 0.006, 0.1), 0.03, loc=(0, -0.031, 0.12), name='Frame', segments=6)
    boolean(cap_ring, rounded_box((0.165, 0.02, 0.089), 0.027, loc=(0, -0.031, 0.12), segments=6))
    assign(cap_ring, M['plastic_black'])
    arm = rounded_box((0.07, 0.06, 0.05), 0.015, loc=(0.1, 0.02, 0.085), name='Arm', segments=5)
    assign(arm, M['plastic_black'])
    base = rounded_box((0.02, 0.09, 0.1), 0.008, loc=(0.14, 0.03, 0.07), name='Base', segments=4)
    assign(base, M['plastic_black'])
    indicator = rounded_box((0.09, 0.02, 0.012), 0.006, loc=(-0.02, 0.04, 0.07), name='Indicator', segments=4)
    indicator.rotation_euler.z = math.radians(8)
    assign(indicator, lib.material('Amber', (1.0, 0.45, 0.05), 0.0, 0.1, transmission=0.7))
    objs = [housing, glass, cap_ring, arm, base, indicator]
    g = lib.parent_all(objs, 'Mirror')
    g.rotation_euler = (0, 0, math.radians(200))
    return objs


# ------------------------------------------------------------------ A/C compressor

def climatisation(M):
    body = lathe([(0.0, 0.0), (0.05, 0.0), (0.055, 0.006), (0.055, 0.14), (0.05, 0.146), (0.0, 0.146)], 'Body', steps=128)
    fins = []
    for i in range(10):
        f = lathe([(0.054, 0.0), (0.059, 0.0), (0.059, 0.003), (0.054, 0.003)], 'Rib', steps=128)
        f.location.z = 0.02 + i * 0.011
        fins.append(f)
    body = lib.join([body] + fins, 'Body')
    assign(body, M['aluminium'])
    ears = []
    for side in (-1, 1):
        e = cube((0.03, 0.028, 0.024), loc=(side * 0.06, 0.0, 0.03))
        h = cylinder(0.0065, 0.1, loc=(side * 0.07, 0, 0.03), rot=(math.pi / 2, 0, 0), verts=24)
        boolean(e, h)
        ears.append(e)
        e2 = cube((0.03, 0.028, 0.024), loc=(side * 0.06, 0.0, 0.118))
        boolean(e2, cylinder(0.0065, 0.1, loc=(side * 0.07, 0, 0.118), rot=(math.pi / 2, 0, 0), verts=24))
        ears.append(e2)
    for e in ears:
        assign(e, M['aluminium'])
    # poly-V pulley and clutch hub on the front
    pulley = lathe([(0.02, 0.146)] + [(0.058 + (0.003 if i % 2 else 0), 0.15 + i * 0.0025) for i in range(12)] + [(0.058, 0.18), (0.02, 0.18)], 'Pulley', steps=160)
    assign(pulley, M['steel'])
    hub = lathe([(0.0, 0.18), (0.045, 0.18), (0.045, 0.186), (0.02, 0.19), (0.0, 0.19)], 'Clutch plate', steps=128)
    assign(hub, M['ecoat'])
    nut = hex_prism(0.008, 0.008, loc=(0, 0, 0.194), name='Nut')
    assign(nut, M['zinc'])
    ports = []
    for x in (-0.018, 0.018):
        p = lathe([(0.0, 0.0), (0.012, 0.0), (0.012, 0.018), (0.0, 0.018)], 'Port', steps=48)
        p.rotation_euler.x = -math.pi / 2
        p.location = (x, 0.052, 0.05)
        cap = lathe([(0.0, 0.018), (0.009, 0.018), (0.009, 0.03), (0.0, 0.03)], 'Port cap', steps=32)
        cap.rotation_euler.x = -math.pi / 2
        cap.location = (x, 0.052, 0.05)
        assign(p, M['aluminium'])
        assign(cap, M['plastic_black'])
        ports += [p, cap]
    plug = rounded_box((0.02, 0.014, 0.016), 0.003, loc=(-0.04, 0.045, 0.13), name='Plug')
    assign(plug, M['plastic_black'])
    objs = [body] + ears + [pulley, hub, nut, plug] + ports
    g = lib.parent_all(objs, 'Compressor')
    g.rotation_euler = (math.radians(-90), 0, math.radians(240))
    g.location = (0, 0, 0.062)
    return objs


# ------------------------------------------------------------------ steering and suspension arm

def direction_et_trains_roulants(M):
    pts = []
    # a wishbone in plan: front bush at (-0.16, 0), rear bush at (0.08, -0.12), ball joint at (0.03, 0.2)
    outline = [(-0.19, -0.03), (-0.13, -0.035), (0.05, -0.15), (0.11, -0.15), (0.11, -0.09), (0.02, -0.02), (0.05, 0.17),
               (0.065, 0.215), (0.0, 0.225), (-0.02, 0.18), (-0.06, 0.02), (-0.19, 0.03)]
    arm = mesh_from_profile(outline, 0.018, 'Arm')
    b = arm.modifiers.new('Round', 'BEVEL')
    b.width = 0.006
    b.segments = 4
    assign(arm, M['ecoat'])
    bush1 = lathe([(0.012, -0.04), (0.028, -0.04), (0.031, -0.032), (0.031, 0.032), (0.028, 0.04), (0.012, 0.04)], 'Bush front', steps=64)
    bush1.rotation_euler.y = math.pi / 2
    bush1.location = (-0.19, 0.0, 0.009)
    sleeve1 = lathe([(0.008, -0.046), (0.0125, -0.046), (0.0125, 0.046), (0.008, 0.046)], 'Sleeve', steps=48)
    sleeve1.rotation_euler.y = math.pi / 2
    sleeve1.location = (-0.19, 0.0, 0.009)
    bush2 = lathe([(0.01, -0.03), (0.034, -0.03), (0.038, -0.02), (0.038, 0.035), (0.034, 0.042), (0.01, 0.042)], 'Bush rear', steps=64)
    bush2.location = (0.11, -0.12, 0.0)
    sleeve2 = lathe([(0.007, -0.036), (0.011, -0.036), (0.011, 0.048), (0.007, 0.048)], 'Sleeve rear', steps=48)
    sleeve2.location = (0.11, -0.12, 0.0)
    ball = lathe([(0.0, 0.0), (0.026, 0.0), (0.026, 0.022), (0.0, 0.022)], 'Ball joint housing', steps=64)
    ball.location = (0.03, 0.2, 0.0)
    boot = lathe([(0.02, 0.022), (0.022, 0.03), (0.018, 0.038), (0.01, 0.045), (0.008, 0.05)], 'Boot', steps=64)
    boot.location = (0.03, 0.2, 0.0)
    stud = lathe([(0.0, 0.05), (0.008, 0.05), (0.006, 0.08), (0.0, 0.08)], 'Stud', steps=32)
    stud.location = (0.03, 0.2, 0.0)
    nut = hex_prism(0.009, 0.008, loc=(0.03, 0.2, 0.084), name='Nut')
    for o, m in [(bush1, M['rubber']), (sleeve1, M['zinc']), (bush2, M['rubber']), (ball, M['zinc']), (boot, M['rubber']), (stud, M['steel']), (nut, M['zinc']), (sleeve2, M['zinc'])]:
        assign(o, m)
    objs = [arm, bush1, sleeve1, bush2, sleeve2, ball, boot, stud, nut]
    g = lib.parent_all(objs, 'Control arm')
    g.rotation_euler = (math.radians(12), math.radians(-6), math.radians(30))
    g.location = (0, 0, 0.04)
    return objs


# ------------------------------------------------------------------ radiator

def refroidissement_moteur(M):
    w, h, d = 0.36, 0.22, 0.03
    core = cube((w, d, h), loc=(0, 0, h / 2 + 0.02), name='Core')
    # fins: a fine stripe in the bump and colour
    fin = lib.material('Fins', (0.6, 0.6, 0.62), 1.0, 0.35)
    nt = fin.node_tree
    p = nt.nodes['Principled BSDF']
    wave = nt.nodes.new('ShaderNodeTexWave')
    wave.wave_type = 'BANDS'
    wave.bands_direction = 'Z'
    wave.inputs['Scale'].default_value = 90
    coord = nt.nodes.new('ShaderNodeTexCoord')
    nt.links.new(coord.outputs['Object'], wave.inputs['Vector'])
    bump = nt.nodes.new('ShaderNodeBump')
    bump.inputs['Strength'].default_value = 0.9
    nt.links.new(wave.outputs['Fac'], bump.inputs['Height'])
    nt.links.new(bump.outputs['Normal'], p.inputs['Normal'])
    ramp = nt.nodes.new('ShaderNodeMapRange')
    ramp.inputs['To Min'].default_value = 0.12
    ramp.inputs['To Max'].default_value = 0.75
    nt.links.new(wave.outputs['Fac'], ramp.inputs['Value'])
    mix = nt.nodes.new('ShaderNodeCombineColor')
    nt.links.new(ramp.outputs['Result'], mix.inputs['Red'])
    nt.links.new(ramp.outputs['Result'], mix.inputs['Green'])
    nt.links.new(ramp.outputs['Result'], mix.inputs['Blue'])
    nt.links.new(mix.outputs['Color'], p.inputs['Base Color'])
    assign(core, fin)
    objs = [core]
    for x in (-w / 2 - 0.02, w / 2 + 0.02):
        tank = rounded_box((0.04, d + 0.012, h + 0.03), 0.008, loc=(x, 0, h / 2 + 0.02), name='Tank')
        assign(tank, M['plastic_black'])
        objs.append(tank)
    for z in (0.02 - 0.004, h + 0.02 + 0.004):
        rail = cube((w, d + 0.004, 0.008), loc=(0, 0, z), name='Rail')
        assign(rail, M['aluminium'])
        objs.append(rail)
    inlet = tube_curve([(-w / 2 - 0.02, 0, h - 0.01), (-w / 2 - 0.06, -0.01, h - 0.01), (-w / 2 - 0.085, -0.03, h - 0.01)], 0.014, 'Inlet')
    outlet = tube_curve([(w / 2 + 0.02, 0, 0.06), (w / 2 + 0.06, -0.01, 0.06), (w / 2 + 0.085, -0.03, 0.06)], 0.014, 'Outlet')
    for o in (inlet, outlet):
        assign(o, M['plastic_black'])
    cap = lathe([(0.0, 0.0), (0.016, 0.0), (0.016, 0.012), (0.0, 0.012)], 'Cap', steps=48)
    cap.location = (w / 2 + 0.02, 0, h + 0.035)
    assign(cap, M['zinc'])
    objs += [inlet, outlet, cap]
    g = lib.parent_all(objs, 'Radiator')
    g.rotation_euler = (math.radians(-10), 0, math.radians(-24))
    g.location = (0, 0.05, 0.0)
    return objs


# ------------------------------------------------------------------ the ways in

def phone(M):
    body = rounded_box((0.075, 0.155, 0.0085), 0.004, loc=(0, 0, 0.0), name='Phone', segments=6)
    b = body.modifiers.new('Corners', 'BEVEL')
    assign(body, lib.material('Frame', (0.3, 0.32, 0.36), 1.0, 0.22))
    back = rounded_box((0.0735, 0.1535, 0.001), 0.0009, loc=(0, 0, -0.0043), name='Back glass')
    assign(back, lib.material('Back glass', (0.01, 0.025, 0.07), 0.0, 0.12, coat=1.0, coat_roughness=0.02))
    screen = rounded_box((0.0735, 0.1535, 0.001), 0.0009, loc=(0, 0, 0.0043), name='Screen')
    assign(screen, lib.material('Screen', (0.004, 0.004, 0.006), 0.0, 0.03, coat=1.0))
    # what the screen shows: the camera, framing a brake disc
    bpy.ops.mesh.primitive_plane_add(size=1, location=(0, 0, 0.0049))
    display = bpy.context.active_object
    display.scale = (0.069, 0.148, 1)
    bpy.ops.object.transform_apply(scale=True)
    dm = bpy.data.materials.new('Display')
    dm.use_nodes = True
    nt = dm.node_tree
    pb = nt.nodes['Principled BSDF']
    tex = nt.nodes.new('ShaderNodeTexImage')
    tex.image = bpy.data.images.load(os.path.join(os.environ.get('OUT', '/tmp/apa-renders'), 'out', 'phone_screen.png'))
    nt.links.new(tex.outputs['Color'], pb.inputs['Base Color'])
    nt.links.new(tex.outputs['Color'], pb.inputs['Emission Color'])
    pb.inputs['Emission Strength'].default_value = 0.9
    pb.inputs['Roughness'].default_value = 0.05
    pb.inputs['Coat Weight'].default_value = 1.0
    assign(display, dm)
    bump = rounded_box((0.034, 0.034, 0.0022), 0.008, loc=(-0.0165, 0.052, -0.0055), name='Camera bump')
    assign(bump, lib.material('Bump glass', (0.02, 0.03, 0.07), 0.2, 0.1, coat=1.0))
    lenses = []
    for (x, y) in [(-0.0245, 0.06), (-0.0245, 0.044), (-0.0085, 0.052)]:
        ring = lathe([(0.0, 0.0), (0.0062, 0.0), (0.0062, 0.0014), (0.0, 0.0014)], 'Lens ring', steps=48)
        ring.rotation_euler.x = math.pi
        ring.location = (x, y, -0.0066)
        assign(ring, M['steel'])
        glass = lathe([(0.0, 0.0), (0.0048, 0.0), (0.0042, 0.0008), (0.0, 0.001)], 'Lens', steps=48)
        glass.rotation_euler.x = math.pi
        glass.location = (x, y, -0.0078)
        assign(glass, lib.material('Lens', (0.005, 0.01, 0.03), 0.3, 0.02, coat=1.0))
        lenses += [ring, glass]
    flash = cylinder(0.0022, 0.001, loc=(-0.0085, 0.062, -0.0068), verts=24, name='Flash')
    assign(flash, lib.material('Flash', (0.95, 0.9, 0.7), 0.0, 0.3))
    objs = [body, back, screen, display, bump, flash] + lenses
    g = lib.parent_all(objs, 'Phone')
    g.scale = (2, 2, 2)
    # the screen toward the camera, standing at an angle, framing the part
    g.rotation_euler = (math.radians(72), math.radians(-6), math.radians(24))
    g.location = (0, 0, 0.16)
    return objs


def magnifier(M):
    ring = lathe([(0.052, -0.007), (0.06, -0.007), (0.061, 0.0), (0.06, 0.007), (0.052, 0.007), (0.051, 0.0)], 'Rim', steps=160)
    assign(ring, M['chrome'])
    lens = lathe([(0.0, -0.004), (0.052, -0.0015), (0.052, 0.0015), (0.0, 0.004)], 'Lens', steps=128)
    assign(lens, M['glass'])
    neck = lathe([(0.0, 0.0), (0.009, 0.0), (0.008, 0.03), (0.0, 0.03)], 'Neck', steps=48)
    neck.rotation_euler.y = math.pi / 2
    neck.location = (0.058, 0, 0)
    assign(neck, M['chrome'])
    handle = lathe([(0.0, 0.0), (0.012, 0.0), (0.0135, 0.02), (0.013, 0.1), (0.011, 0.115), (0.0, 0.117)], 'Handle', steps=64)
    handle.rotation_euler.y = math.pi / 2
    handle.location = (0.086, 0, 0)
    assign(handle, lib.material('Handle', (0.015, 0.03, 0.09), 0.0, 0.3, coat=1.0, coat_roughness=0.1))
    band = lathe([(0.0, 0.0), (0.0138, 0.0), (0.0138, 0.008), (0.0, 0.008)], 'Band', steps=64)
    band.rotation_euler.y = math.pi / 2
    band.location = (0.094, 0, 0)
    assign(band, M['gold_paint'])
    objs = [ring, lens, neck, handle, band]
    g = lib.parent_all(objs, 'Magnifier')
    g.scale = (2.2, 2.2, 2.2)
    g.rotation_euler = (math.radians(62), math.radians(-18), math.radians(-35))
    g.location = (0, 0, 0.17)
    return objs


def car_key(M):
    fob = rounded_box((0.036, 0.062, 0.014), 0.007, loc=(0, 0, 0), name='Fob', segments=8)
    sub = fob.modifiers.new('Sub', 'SUBSURF')
    sub.levels = 2
    sub.render_levels = 2
    assign(fob, lib.material('Fob', (0.012, 0.012, 0.014), 0.0, 0.25, coat=0.8, coat_roughness=0.08))
    trim = rounded_box((0.0372, 0.0632, 0.003), 0.0015, loc=(0, 0, 0.0), name='Trim')
    boolean(trim, rounded_box((0.033, 0.059, 0.01), 0.005, loc=(0, 0, 0.0)))
    assign(trim, M['chrome'])
    buttons = []
    for i, y in enumerate([0.016, 0.0, -0.016]):
        b = rounded_box((0.02, 0.011, 0.003), 0.0028, loc=(0, y, 0.0072), name='Button', segments=4)
        assign(b, lib.material('Button', (0.03, 0.03, 0.035), 0.0, 0.5))
        buttons.append(b)
    icons = []
    for i, y in enumerate([0.016, 0.0, -0.016]):
        ic = rounded_box((0.005, 0.0035, 0.0006), 0.0006, loc=(0, y, 0.0088), name='Icon')
        assign(ic, lib.material('Icon', (0.6, 0.62, 0.66), 0.8, 0.3))
        icons.append(ic)
    blade_pts = [(-0.0045, 0.0), (0.0045, 0.0), (0.0045, 0.06), (0.001, 0.068), (-0.0045, 0.064)]
    blade = lib.mesh_from_profile(blade_pts, 0.0028, 'Blade')
    blade.rotation_euler.x = 0
    blade.location = (0, 0.03, -0.0014)
    # the cut along the blade
    groove = cube((0.003, 0.05, 0.004), loc=(0.0012, 0.06, 0.001))
    boolean(blade, groove)
    assign(blade, M['steel'])
    ring = lathe([(0.0085, -0.0012), (0.0105, -0.0012), (0.0105, 0.0012), (0.0085, 0.0012)], 'Key ring', steps=64)
    ring.location = (0, -0.036, 0)
    ring.rotation_euler.y = math.radians(70)
    assign(ring, M['chrome'])
    objs = [fob, trim, blade, ring] + buttons + icons
    g = lib.parent_all(objs, 'Key')
    g.scale = (3.4, 3.4, 3.4)
    g.rotation_euler = (math.radians(58), math.radians(-12), math.radians(-28))
    g.location = (0, 0, 0.13)
    return objs
