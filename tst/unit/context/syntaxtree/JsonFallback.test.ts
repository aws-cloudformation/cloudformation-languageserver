import { describe, it, expect } from 'vitest';
import { JsonSyntaxTree } from '../../../../src/context/syntaxtree/JsonSyntaxTree';

describe('JSON Fallback for Malformed Documents', () => {
    describe('Incomplete Keys', () => {
        it('should resolve path for incomplete key in Properties', () => {
            const content = `{
  "Resources": {
    "MyBucket": {
      "Type": "AWS::S3::Bucket",
      "Properties": {
        "Buck`;
            const tree = new JsonSyntaxTree(content);
            const node = tree.getNodeAtPosition({ line: 5, character: 13 });
            const pathInfo = tree.getPathAndEntityInfo(node);

            expect(pathInfo.propertyPath).toEqual(['Resources', 'MyBucket', 'Properties', 'Buck']);
            tree.cleanup();
        });

        it('should resolve path for key without value', () => {
            const content = `{
  "Resources": {
    "MyBucket": {
      "Type": "AWS::S3::Bucket",
      "Properties": {
        "BucketName":`;
            const tree = new JsonSyntaxTree(content);
            const node = tree.getNodeAtPosition({ line: 5, character: 21 });
            const pathInfo = tree.getPathAndEntityInfo(node);

            expect(pathInfo.propertyPath).toEqual(['Resources', 'MyBucket', 'Properties', 'BucketName']);
            tree.cleanup();
        });
    });

    describe('Array Items', () => {
        it('should resolve path for incomplete array item', () => {
            const content = `{
  "Resources": {
    "MyBucket": {
      "Type": "AWS::S3::Bucket",
      "Properties": {
        "Tags": [
          { "Key":`;
            const tree = new JsonSyntaxTree(content);
            const node = tree.getNodeAtPosition({ line: 6, character: 18 });
            const pathInfo = tree.getPathAndEntityInfo(node);

            expect(pathInfo.propertyPath).toEqual(['Resources', 'MyBucket', 'Properties', 'Tags', 'Key']);
            tree.cleanup();
        });
    });

    describe('Intrinsic Functions', () => {
        it('should resolve path for incomplete Fn::Sub', () => {
            const content = `{
  "Resources": {
    "MyBucket": {
      "Type": "AWS::S3::Bucket",
      "Properties": {
        "BucketName": { "Fn::Sub":`;
            const tree = new JsonSyntaxTree(content);
            const node = tree.getNodeAtPosition({ line: 5, character: 34 });
            const pathInfo = tree.getPathAndEntityInfo(node);

            expect(pathInfo.propertyPath).toEqual(['Resources', 'MyBucket', 'Properties', 'BucketName', 'Fn::Sub']);

            tree.cleanup();
        });
    });
});
