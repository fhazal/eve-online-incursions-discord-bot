#!/bin/bash

echo "📦 Deploying slash commands..."
yarn deploy --transpile-only

echo "🚀 Starting the bot..."
yarn bot --transpile-only
