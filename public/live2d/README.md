# Live2D Model Files

Place your Live2D model files here.

## Required Structure

For a **Live2D Cubism 2.x** model:
```
live2d/
├── model.json          (main model definition)
├── model.moc           (compiled model)
├── model.cfg           (optional config)
├── expressions/        (optional expressions)
│   └── *.json
├── motions/            (optional motions)
│   └── *.mtn
└── textures/
    └── *.png
```

For a **Live2D Cubism 3.x/4.x** model:
```
live2d/
├── model.model3.json   (main model definition)
├── model.moc3          (compiled model)
├── model.physics3.json (optional physics)
├── model.cdi3.json     (optional display info)
├── expressions/        (optional)
│   └── *.exp3.json
├── motions/            (optional)
│   └── *.motion3.json
└── textures/
    └── *.png
```

## Where to Get Models

Free models:
- https://booth.pm/en/search/Live2D (search for "free")
- https://nizima.com/en/ (Live2D marketplace)
- https://www.live2d.com/en/download/sample-data/

## Note

Make sure the paths in model.json reference files relative to the model.json location.
